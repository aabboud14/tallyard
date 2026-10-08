// The consultant's waste engagements: load a demolition bill, review its rows.
import type { Destination } from '../../domain/types'
import { parseBillCells, editRow, type Cell } from '../../domain/engines/billImport'
import type { ActionResult, Actor, AppData } from '../types'
import { ERRORS, canOpenEngagement } from '../access'
import { log } from '../notifications'
import { acting, fail, ok, withWorld } from './common'

export const WASTE_ERRORS = {
  noEngagement: 'That engagement could not be found.',
  unreadable: 'That file has no recognisable header row. Use the sample bill or a bill with the same columns.',
  noBill: 'Load a bill first.',
  noRow: 'That row could not be found.',
} as const

/** Reads the rows of a demolition bill (cells from the spreadsheet) into the engagement. */
export function loadWasteBill(state: AppData, actor: Actor, engagementId: string, cells: Cell[][]): ActionResult<number> {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const e = state.world.engagements[engagementId]
  if (!e) return fail(state, WASTE_ERRORS.noEngagement)
  if (!canOpenEngagement(state, actor.userId, engagementId)) return fail(state, ERRORS.noAccess)
  let bill
  try {
    bill = parseBillCells(cells)
  } catch {
    return fail(state, WASTE_ERRORS.unreadable)
  }
  if (bill.rows.length === 0) return fail(state, WASTE_ERRORS.unreadable)
  const w = structuredClone(state.world)
  w.engagements[engagementId].bill = bill
  let s = withWorld(state, w)
  s = log(s, { at: a.now, orgIds: [e.consultantOrgId], projectId: null, buildingId: null, actorUserId: a.user.id, actor: a.user.name, text: `loaded the demolition bill for ${e.name}: ${bill.rows.length} rows`, href: `/app/engagements/${engagementId}/waste` })
  return ok(s, bill.rows.length)
}

/** The consultant corrects a row's stream or destination. */
export function editWasteRow(state: AppData, actor: Actor, engagementId: string, row: number, patch: { stream?: string | null; destination?: Destination | null }): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const e = state.world.engagements[engagementId]
  if (!e) return fail(state, WASTE_ERRORS.noEngagement)
  if (!canOpenEngagement(state, actor.userId, engagementId)) return fail(state, ERRORS.noAccess)
  if (!e.bill) return fail(state, WASTE_ERRORS.noBill)
  if (!e.bill.rows.some((r) => r.row === row)) return fail(state, WASTE_ERRORS.noRow)
  const w = structuredClone(state.world)
  const bill = w.engagements[engagementId].bill!
  bill.rows = bill.rows.map((r) => (r.row === row ? editRow(r, patch) : r))
  return ok(withWorld(state, w))
}

export function clearWasteBill(state: AppData, actor: Actor, engagementId: string): ActionResult {
  const a = acting(state, actor)
  if (typeof a === 'string') return fail(state, a)
  const e = state.world.engagements[engagementId]
  if (!e) return fail(state, WASTE_ERRORS.noEngagement)
  if (!canOpenEngagement(state, actor.userId, engagementId)) return fail(state, ERRORS.noAccess)
  if (!e.bill) return ok(state)
  const w = structuredClone(state.world)
  w.engagements[engagementId].bill = null
  return ok(withWorld(state, w))
}
