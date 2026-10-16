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
import * as claims from './actions/claims'
import * as contractor from './actions/contractor'
import * as testing from './actions/testing'
import * as links from './actions/links'
import * as sustainability from './actions/sustainability'

function bind<V, A extends unknown[]>(fn: (s: AppData, actor: Actor, ...args: A) => ActionResult<V>): (...args: A) => Outcome<V> {
  return (...args: A) => useApp.getState().run(fn, ...args)
}

export const act = {
  // Projects
  createProject: bind(projects.createProject),
  updateProject: bind(projects.updateProject),
  decideClientLink: bind(projects.decideClientLink),
  requestClientLink: bind(projects.requestClientLink),
  setProjectProgramme: bind(projects.setProjectProgramme),
  setProjectRequirements: bind(projects.setProjectRequirements),
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
  // Donor building owner
  createBuilding: bind(owner.createBuilding),
  updateBuilding: bind(owner.updateBuilding),
  setBuildingStructure: bind(owner.setBuildingStructure),
  createOwnerProject: bind(owner.createOwnerProject),
  appointProjectArchitect: bind(owner.appointProjectArchitect),
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
  // Buildings a surveyor adds, and their owners' confirmation
  createSurveyBuilding: bind(claims.createSurveyBuilding),
  requestBuildingClaim: bind(claims.requestBuildingClaim),
  withdrawBuildingClaim: bind(claims.withdrawBuildingClaim),
  decideBuildingClaim: bind(claims.decideBuildingClaim),
  deleteSurveyBuilding: bind(claims.deleteSurveyBuilding),
  mergeSurveyBuilding: bind(claims.mergeSurveyBuilding),
  // Deconstruction contractor
  appointContractor: bind(contractor.appointContractor),
  setContractorDates: bind(contractor.setContractorDates),
  applyContractorDates: bind(contractor.applyContractorDates),
  inviteContractorByEmail: bind(contractor.inviteContractorByEmail),
  withdrawContractorInvite: bind(contractor.withdrawContractorInvite),
  // Testing
  requestTesting: bind(testing.requestTesting),
  recordTestingBooked: bind(testing.recordTestingBooked),
  recordTestResults: bind(testing.recordTestResults),
  cancelTesting: bind(testing.cancelTesting),
  // Share links
  createShareLink: bind(links.createShareLink),
  openShareLink: bind(links.openShareLink),
  revokeShareLink: bind(links.revokeShareLink),
  // Consultant
  loadWasteBill: bind(consultant.loadWasteBill),
  editWasteRow: bind(consultant.editWasteRow),
  clearWasteBill: bind(consultant.clearWasteBill),
  // Sustainability: targets, results, requirements, certification and the circular economy statement
  setGoalTarget: bind(sustainability.setGoalTarget),
  resetGoalTarget: bind(sustainability.resetGoalTarget),
  setGoalActual: bind(sustainability.setGoalActual),
  clearGoalActual: bind(sustainability.clearGoalActual),
  setRequirementStatus: bind(sustainability.setRequirementStatus),
  addRequirementEvidence: bind(sustainability.addRequirementEvidence),
  removeRequirementEvidence: bind(sustainability.removeRequirementEvidence),
  setCreditTargeted: bind(sustainability.setCreditTargeted),
  setCreditStatus: bind(sustainability.setCreditStatus),
  setCreditNote: bind(sustainability.setCreditNote),
  setCreditItem: bind(sustainability.setCreditItem),
  editStatementSection: bind(sustainability.editStatementSection),
  resetStatementSection: bind(sustainability.resetStatementSection),
  sendStatementForReview: bind(sustainability.sendStatementForReview),
  reviewStatement: bind(sustainability.reviewStatement),
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
