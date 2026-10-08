// Fixed labels (04-PRIVACY-AND-SCREENS.md section 6). The required-labels test checks each.
export const LABELS = {
  L1: 'Prototype, sample data',
  L2: 'Rule-based in this prototype. Stands in for an AI step.',
  L3: 'Simulated agent: scripted rules, no AI model',
  L4: "Indicative match. Subject to the structural engineer's check to SCI P427.",
  L5: 'Estimate. Storage is costed at the longest case until the handover date is confirmed.',
  L6: 'Some lots are offered for private matching only. Accept the confidentiality terms to include lots from owners who have approved this project.',
  L7: "Confidentiality terms (simulated). Lots shared for private matching may be used only for this project's design and procurement, and must not be passed on.",
  L8: 'Sample data only. Do not enter real buildings or photos.',
  L9: 'Illustrative and rule-based. It does not measure how many real buildings fit this description.',
  L10: 'Market signal, updated monthly',
  L11: 'Comparison with buying new, modules A1-A4, simplified method. Not a whole life carbon assessment.',
  L12: 'A project assessment would use the factor for the steel the project would otherwise buy.',
  L13: "Potential carbon benefit of reuse. Reported outside the building's life cycle (module D). Do not add it to a receiving project's figures.",
  L14: 'No avoided carbon is claimed for unused surplus.',
  L15: 'Material values exclude labour. A reused item counts at the price of the same quantity of new product.',
  L16: 'Policy basis: London Plan 2021 and the 2022 guidance. A draft new plan is in consultation.',
  L17: 'Forecast, design stage',
  L18: "Actual, from contractor's bill",
  L19: 'Input to the evidence for this requirement. Confirm with the assessor and the current scheme manual.',
  // Reworded for the platform (rule P1): the sandbox holds sample data; nothing here is called a prototype.
  L20: 'Sample data from the sandbox. Indicative factors. Not a compliant assessment.',
  L21: 'Approve as Lantern Quay Developments',
  L22: 'Deposit held (simulated)',
  L23: 'Held by the platform, withheld by seller',
  L24: 'Seller not simulated in this prototype',
  L25: 'Reserving this lot is not part of this prototype.',
  L26: 'Not available',
  L27: 'Shared in confidence',
  L28: 'Private',
  L29: 'As principal the platform would trade against users whose limits and programmes it holds.',
  L30: "Candidate for discussion, not from the founder's notes",
  L31: "Candidate, not from the founder's notes",
  L32: 'Founder assumption, to be validated',
  L33: 'Not part of this prototype.',
  L34: 'Publishing at this disclosure level lets an outsider narrow down the building. Review what is listed below.',
  // Version 1.0 (brief/09-V1-PRODUCT.md section 7).
  L35: 'Version 2. Not in this release.',
  L36: 'Illustration generated from the survey record, not a photograph.',
  L37: 'Indicative sustainability band, rule-based. Stands in for a reviewed assessment.',
  L38: 'Timeline check against the project start date. Indicative.',
  L39: 'Compiled from the public listing. Confirm with the seller, the engineer and testing before specifying.',
  L40: 'Approval and purchase sit with the client, not the architect.',
  L41: 'The UK decision tree has five steps: reuse, upcycle, downcycle, recycle, scrap. The rule in this version assigns reuse, downcycle and recycle.',
  L42: 'Geometry generated from the recorded dimensions.',
  L43: 'Expected by the surveyor. The owner sets the date when listing.',
} as const

export type LabelId = keyof typeof LABELS

export const EMPTY_STATE = 'Nothing here yet.'
export const ERROR_STATE = 'Something went wrong. Reset demo data to start again.'
export const SIGNAL_LABELS = { low: 'Low demand', balanced: 'Balanced', high: 'High demand' } as const
export const VISIBILITY_LABELS = { private: 'Private', matched_only: 'Private matching only', open: 'Open marketplace' } as const
export const TEST_STATUS_LABELS = { untested: 'Untested', inspected: 'Inspected', tested: 'Tested', certified: 'Certified' } as const
export const GRADE_UNKNOWN = 'To be confirmed by testing'
export const OWNER_VISIBILITY_LABELS = { private: 'Private', matched_only: 'Shared privately with selected projects', open: 'Published to the marketplace' } as const
export const TIMELINE_TEXT = {
  in_time: 'Available in time',
  tight: 'Tight: available close to the start date',
  late: 'Not available in time',
  now: 'Available now: storage until the start',
} as const
export const BAND_WORDS = { high: 'High', medium: 'Medium', low: 'Low', none: 'Not claimed' } as const
export const WISH_STATUS_LABELS = { pending: 'Pending', sent: 'Sent to client', approved: 'Approved', declined: 'Declined' } as const
export const TYPOLOGY_LABELS = { structure: 'Structure', envelope: 'Envelope', finishes: 'Finishes' } as const
export const DECISION_ROUTE_LABELS = { reuse: 'Reuse', upcycle: 'Upcycle', downcycle: 'Downcycle', recycle: 'Recycle', scrap: 'Scrap' } as const
export const PROJECT_TYPE_LABELS = { office: 'Office', hotel: 'Hotel', residential: 'Residential', other: 'Other' } as const
export const NOT_SHARED = 'No longer shared with this project'
export const NOT_AVAILABLE_TO_ROLE = 'Not available to this role'
export const SOURCE_TYPE_LABELS ={ deconstruction: 'Deconstruction', unused_surplus: 'Unused surplus', fit_out_strip: 'Fit-out strip' } as const
