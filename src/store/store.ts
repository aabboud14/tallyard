// The one shared world, held in one browser. Persisted under the app's own key.
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Destination, LocationLevel, Photo, TimingLevel, Visibility, World } from '../domain/types'
import { STORAGE_PREFIX } from '../domain/constants'
import { createSeed, PERSONA_IDS } from '../domain/seed/world'
import { safeStorage } from './safeStorage'
import { clearPhotos } from './photoDb'
import * as act from './actions'
import type { Cell } from '../domain/engines/billImport'

export const STORE_KEY = `${STORAGE_PREFIX}-state`

export type StoreState = {
  world: World
  personaId: string
  lastCapturedItemId: string | null
  reset: () => Promise<void>
  setPersona: (id: string) => void
  capture: (input: act.CaptureInput) => string
  addPhoto: (itemId: string, photo: Photo) => void
  setPhotoPublic: (itemId: string, photoId: string, isPublic: boolean) => void
  setDisclosure: (buildingId: string, patch: { locationLevel?: LocationLevel; timingLevel?: TimingLevel }) => void
  resetDisclosureDefaults: (buildingId: string) => void
  publishLot: (lotId: string, input: { visibility: Exclude<Visibility, 'private'>; ask: number; reserve: number }) => void
  loadSampleSchedule: (projectId: string) => void
  acceptTerms: (projectId: string) => void
  addToPlan: (projectId: string, publicId: string, ref: string) => void
  setPlanPackage: (projectId: string, planItemId: string, patch: { facilityId?: string; testing?: boolean }) => void
  startNegotiation: (projectId: string, planItemId: string, mandate: { open: number; max: number }) => void
  buyerApprove: (projectId: string, planItemId: string) => void
  sellerApprove: (projectId: string, planItemId: string) => string
  arrangeDelivery: (dealId: string) => void
  approveBooking: (dealId: string) => void
  loadSampleBillCells: (engagementId: string, cells: Cell[][]) => void
  editBillRow: (engagementId: string, row: number, patch: { stream?: string | null; destination?: Destination | null }) => void
  replaceWorld: (world: World, personaId?: string) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      world: createSeed(),
      personaId: PERSONA_IDS.tom,
      lastCapturedItemId: null,
      reset: async () => {
        await clearPhotos()
        set({ world: createSeed(), personaId: PERSONA_IDS.tom, lastCapturedItemId: null })
      },
      setPersona: (id) => set({ personaId: id }),
      capture: (input) => {
        const r = act.captureItem(get().world, input)
        set({ world: r.world, lastCapturedItemId: r.itemId })
        return r.itemId
      },
      addPhoto: (itemId, photo) => set({ world: act.addPhoto(get().world, itemId, photo) }),
      setPhotoPublic: (itemId, photoId, isPublic) => set({ world: act.setPhotoPublic(get().world, itemId, photoId, isPublic) }),
      setDisclosure: (buildingId, patch) => set({ world: act.setDisclosure(get().world, buildingId, patch) }),
      resetDisclosureDefaults: (buildingId) => set({ world: act.resetDisclosureDefaults(get().world, buildingId) }),
      publishLot: (lotId, input) => set({ world: act.publishLot(get().world, lotId, input) }),
      loadSampleSchedule: (projectId) => set({ world: act.loadSampleSchedule(get().world, projectId) }),
      acceptTerms: (projectId) => set({ world: act.acceptTerms(get().world, projectId) }),
      addToPlan: (projectId, publicId, ref) => set({ world: act.addToPlan(get().world, projectId, publicId, ref) }),
      setPlanPackage: (projectId, planItemId, patch) => set({ world: act.setPlanPackage(get().world, projectId, planItemId, patch) }),
      startNegotiation: (projectId, planItemId, mandate) => set({ world: act.startNegotiation(get().world, projectId, planItemId, mandate) }),
      buyerApprove: (projectId, planItemId) => set({ world: act.buyerApprove(get().world, projectId, planItemId) }),
      sellerApprove: (projectId, planItemId) => {
        const r = act.sellerApprove(get().world, projectId, planItemId)
        set({ world: r.world })
        return r.dealId
      },
      arrangeDelivery: (dealId) => set({ world: act.arrangeDelivery(get().world, dealId) }),
      approveBooking: (dealId) => set({ world: act.approveBooking(get().world, dealId) }),
      loadSampleBillCells: (engagementId, cells) => set({ world: act.loadSampleBillCells(get().world, engagementId, cells) }),
      editBillRow: (engagementId, row, patch) => set({ world: act.editBillRow(get().world, engagementId, row, patch) }),
      replaceWorld: (world, personaId) => set({ world, ...(personaId ? { personaId } : {}) }),
    }),
    {
      name: STORE_KEY,
      // Version 2 (brief 09 section 13.2): a stored version 0.5 world is replaced by a fresh seed.
      version: 2,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ world: s.world, personaId: s.personaId, lastCapturedItemId: s.lastCapturedItemId }),
      migrate: () => ({ world: createSeed(), personaId: PERSONA_IDS.tom, lastCapturedItemId: null }),
    },
  ),
)
