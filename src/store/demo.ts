// The demo replay (02 section 5). Each step performs that step's actions through the store.
import { useStore } from './store'
import { captureAssist } from '../domain/engines/assist'
import { PERSONA_IDS, TIVERNE_ID, MERROWGATE_ID, DURNLEY_ID, SAMPLE_PHOTO_DATA_URI } from '../domain/seed/world'
import { lotOf, lotByPublicId } from './actions'
import { cellsFromArrayBuffer, base64ToArrayBuffer } from '../domain/engines/billXlsx'
import { SAMPLE_BILL_XLSX_BASE64 } from '../domain/reference/samples'
import { putPhoto, reencodePhoto } from './photoDb'
import type { Photo, Spec, Quantity } from '../domain/types'
import { captureInputFromAssist } from './capture'

export type DemoStep = { n: number; title: string; line: string; personaId: string; route: string; width?: number }

export const DEMO_STEPS: DemoStep[] = [
  { n: 1, title: 'Capture on site', line: 'Dana types a description, Assist fills the fields, she adds a photo and saves TH-12.', personaId: PERSONA_IDS.dana, route: `/buildings/${TIVERNE_ID}/capture`, width: 390 },
  { n: 2, title: 'Decide what to recover', line: 'Tom reads the ranked list and opens the score for the first row.', personaId: PERSONA_IDS.tom, route: `/buildings/${TIVERNE_ID}/priority` },
  { n: 3, title: 'Publish without leaking', line: 'Tom watches the disclosure score, resets to defaults and publishes TH-01 to the open marketplace.', personaId: PERSONA_IDS.tom, route: `/buildings/${TIVERNE_ID}/listings` },
  { n: 4, title: 'Find it', line: 'Priya browses and opens listing L-9F4CQQ.', personaId: PERSONA_IDS.priya, route: '/market' },
  { n: 5, title: 'Match a schedule', line: 'Isla loads the sample schedule, accepts the confidentiality terms and adds the L-9F4CQQ allocation to the plan.', personaId: PERSONA_IDS.isla, route: `/projects/${MERROWGATE_ID}/match` },
  { n: 6, title: 'Bridge the gap', line: 'Isla reads the storage, testing and transport package for the plan item.', personaId: PERSONA_IDS.isla, route: `/projects/${MERROWGATE_ID}/plan` },
  { n: 7, title: 'Negotiate through an agent', line: 'Isla starts the negotiation agent with the suggested mandate and approves the outcome.', personaId: PERSONA_IDS.isla, route: `/projects/${MERROWGATE_ID}/plan` },
  { n: 8, title: 'Seller approves', line: 'Tom approves the blind offer; both sides see the confirmed deal.', personaId: PERSONA_IDS.tom, route: '/offers' },
  { n: 9, title: 'Logistics', line: 'Isla arranges delivery through the logistics agent and approves the booking.', personaId: PERSONA_IDS.isla, route: `/projects/${MERROWGATE_ID}/deals` },
  { n: 10, title: 'Prove it', line: 'Marcus reads the project compliance dashboard, exports the workbook and prints.', personaId: PERSONA_IDS.marcus, route: `/projects/${MERROWGATE_ID}/compliance` },
  { n: 11, title: 'Ingest a demolition bill', line: 'Marcus loads the sample bill, reviews one row and exports the waste and reuse workbook.', personaId: PERSONA_IDS.marcus, route: `/engagements/${DURNLEY_ID}/waste` },
  { n: 12, title: 'Run the platform', line: 'The operator reads the ledger and the model comparison for the deal.', personaId: PERSONA_IDS.operator, route: '/operator/ledger' },
]

export const STEP1_TEXT = '30 no. 203x203x46 UC, 3.2m long, bolted, roof plant room'
export const STEP7_MANDATE = { open: 700, max: 780 }
export const STEP3_PRICES = { ask: 800, reserve: 730 }

async function samplePhoto(): Promise<Photo> {
  const id = 'pho_demo_th12'
  if (typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
    try {
      const blob = await (await fetch(SAMPLE_PHOTO_DATA_URI)).blob()
      const jpeg = await reencodePhoto(blob)
      await putPhoto(id, jpeg)
      return { id, kind: 'blob', src: null, isPublic: false }
    } catch {
      // fall through to the data URI
    }
  }
  return { id, kind: 'data', src: SAMPLE_PHOTO_DATA_URI, isPublic: false }
}

function planItemId(): string {
  const p = useStore.getState().world.projects[MERROWGATE_ID]
  const item = p.planItems.find((i) => i.lotPublicId === 'L-9F4CQQ')
  if (!item) throw new Error('Step 5 has not run')
  return item.id
}

function dealId(): string {
  const d = Object.values(useStore.getState().world.deals).find((x) => x.lotPublicId === 'L-9F4CQQ')
  if (!d) throw new Error('Step 8 has not run')
  return d.id
}

export async function runDemoStep(n: number): Promise<void> {
  const s = useStore.getState()
  switch (n) {
    case 1: {
      const parsed = captureAssist(STEP1_TEXT)
      const input = captureInputFromAssist(parsed, { buildingId: TIVERNE_ID, condition: 'A', capturedBy: 'Dana Kowalski', notes: '' })
      const photo = await samplePhoto()
      s.capture({ ...input, photos: [photo] })
      return
    }
    case 2:
    case 4:
    case 6:
    case 10:
    case 12:
      return
    case 3: {
      const lot = lotOf(s.world, Object.values(s.world.items).find((i) => i.tag === 'TH-01')!.id)
      s.setDisclosure(TIVERNE_ID, { locationLevel: 'local_authority' })
      s.setDisclosure(TIVERNE_ID, { timingLevel: 'month' })
      s.setPhotoPublic(lot.itemId, 'pho_th01', true)
      s.resetDisclosureDefaults(TIVERNE_ID)
      s.publishLot(lot.id, { visibility: 'open', ask: STEP3_PRICES.ask, reserve: STEP3_PRICES.reserve })
      return
    }
    case 5: {
      s.loadSampleSchedule(MERROWGATE_ID)
      s.acceptTerms(MERROWGATE_ID)
      s.addToPlan(MERROWGATE_ID, 'L-9F4CQQ', 'R1')
      return
    }
    case 7: {
      const id = planItemId()
      s.startNegotiation(MERROWGATE_ID, id, STEP7_MANDATE)
      s.buyerApprove(MERROWGATE_ID, id)
      return
    }
    case 8: {
      s.sellerApprove(MERROWGATE_ID, planItemId())
      return
    }
    case 9: {
      const id = dealId()
      s.arrangeDelivery(id)
      s.approveBooking(id)
      return
    }
    case 11: {
      const cells = await cellsFromArrayBuffer(base64ToArrayBuffer(SAMPLE_BILL_XLSX_BASE64))
      s.loadSampleBillCells(DURNLEY_ID, cells)
      s.editBillRow(DURNLEY_ID, 20, { stream: 'mixed_cd', destination: 'landfill' })
      return
    }
    default:
      throw new Error('No such demo step: ' + n)
  }
}

/** Runs steps from..to in order. Starts from a fresh seed when from is 1. */
export async function runDemoSteps(from: number, to: number): Promise<void> {
  if (from === 1) await useStore.getState().reset()
  for (let n = from; n <= to; n++) await runDemoStep(n)
}

export { lotByPublicId, planItemId as demoPlanItemId, dealId as demoDealId }

export type { Spec, Quantity }
