// Every action, bound to the signed-in person and the clock. Screens call act.saveToProject(publicId, projectId)
// and read { ok, error, value, undo }. The pure functions stay in ./actions for tests.
import type { ActionResult, Actor, AppData } from './types'
import { useApp, type Outcome } from './app'
import * as projects from './actions/projects'
import * as shortlist from './actions/shortlist'
import * as reservations from './actions/reservations'
import * as owner from './actions/owner'
import * as surveyor from './actions/surveyor'
import * as team from './actions/team'
import * as consultant from './actions/consultant'

function bind<V, A extends unknown[]>(fn: (s: AppData, actor: Actor, ...args: A) => ActionResult<V>): (...args: A) => Outcome<V> {
  return (...args: A) => useApp.getState().run(fn, ...args)
}

export const act = {
  // Projects
  createProject: bind(projects.createProject),
  updateProject: bind(projects.updateProject),
  acceptTerms: bind(projects.acceptTerms),
  setProjectConsultant: bind(projects.setProjectConsultant),
  editSpecHeader: bind(projects.editSpecHeader),
  editSpecClauseNote: bind(projects.editSpecClauseNote),
  // Shortlists
  saveToProject: bind(shortlist.saveToProject),
  removeFromList: bind(shortlist.removeFromList),
  moveItem: bind(shortlist.moveItem),
  editItemNote: bind(shortlist.editItemNote),
  sendToClient: bind(shortlist.sendToClient),
  decideItem: bind(shortlist.decideItem),
  reopenItem: bind(shortlist.reopenItem),
  // Reservations
  requestReservation: bind(reservations.requestReservation),
  withdrawReservation: bind(reservations.withdrawReservation),
  decideReservation: bind(reservations.decideReservation),
  // Asset owner
  createBuilding: bind(owner.createBuilding),
  updateBuilding: bind(owner.updateBuilding),
  appointSurveyor: bind(owner.appointSurveyor),
  setLotVisibility: bind(owner.setLotVisibility),
  setLotAvailability: bind(owner.setLotAvailability),
  setDisclosure: bind(owner.setDisclosure),
  resetDisclosure: bind(owner.resetDisclosure),
  setPhotoPublic: bind(owner.setPhotoPublic),
  setProjectAccess: bind(owner.setProjectAccess),
  // Surveyor
  captureItem: bind(surveyor.captureItem),
  updateItem: bind(surveyor.updateItem),
  addPhoto: bind(surveyor.addPhoto),
  removePhoto: bind(surveyor.removePhoto),
  submitSurvey: bind(surveyor.submitSurvey),
  reopenSurvey: bind(surveyor.reopenSurvey),
  // Consultant
  loadWasteBill: bind(consultant.loadWasteBill),
  editWasteRow: bind(consultant.editWasteRow),
  clearWasteBill: bind(consultant.clearWasteBill),
  // Team, profile, organisation and notifications
  createInvite: bind(team.createInvite),
  revokeInvite: bind(team.revokeInvite),
  updateProfile: bind(team.updateProfile),
  updateOrganisation: bind(team.updateOrganisation),
  setNotificationPref: bind(team.setNotificationPref),
  readNotification: bind(team.readNotification),
  readAllNotifications: bind(team.readAllNotifications),
} as const

export type Act = typeof act
