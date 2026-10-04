// Open questions for the founder, read by the About screen. Mirrors docs/OPEN_QUESTIONS.md.
export const OPEN_QUESTIONS: { group: string; items: string[] }[] = [
  {
    group: 'The workflow itself',
    items: [
      'The compliance workflow in this prototype is reconstructed from public guidance, because the process notes were not available when it was written. Does it match how these submissions are actually prepared, and what is missing?',
      'Certification mapping: confirm the issue IDs and wording for the BREEAM and LEED versions in use, the policy basis and targets, and the exact columns of the current Circular Economy Statement template.',
      'At RIBA Stages 1 and 2, do design teams have a member schedule to match against, or should matching start from the available stock and shape the design?',
      'Do the four simplified steel test statuses (untested, inspected, tested, certified) map sensibly onto SCI P427 in practice? P427 also groups members by source structure, which bears on the question of who lists arisings.',
    ],
  },
  {
    group: 'Numbers to replace',
    items: [
      'Carbon factors: which sources and values should replace the indicative and placeholder factors, above all for facade products and raised access floors? The steel baseline is a UK average; a project assessment would use the factor for the steel that project would otherwise buy.',
      'Is 20% the right working discount for reclaimed steel against new, and is that before or after testing, storage and transport? The sample deal shows 8.5% all-in against new steel bought to the same schedule.',
      'Are the fee levels plausible: 8% commission, 10% storage brokerage, 10% testing referral, and the subscription prices? Should testing and survey be referrals or the platform\'s own services? Is a transport margin wanted at all, or does it sour the haulage relationship?',
      'Content by value: this prototype values reclaimed items at the price of the same quantity of new product, on material cost excluding labour, which follows the guidance. Is that how your assessors do it?',
      'Storage, handling and testing rates: no public source was found for these. What do partners actually charge?',
    ],
  },
  {
    group: 'The model',
    items: [
      'Who pays for what? The notes have the donor paying storage until the sale completes, which is what this prototype does. The demo deal is agreed before deconstruction, so the buyer pays from handover. Who normally pays for testing?',
      'Which business model should the next version assume: agency, principal, hybrid, or the forward sale added here as a candidate? As principal the platform would trade against users whose limits and programmes it holds.',
      'Who holds title to arisings and who lists them: the owner or the deconstruction contractor?',
      'Should the platform ever own storage, or only broker it?',
      'Do passive users (architects, consultants) pay a subscription, or is access bundled with their client\'s?',
      'Which material families matter most after structural steel and stone?',
    ],
  },
  {
    group: 'Disclosure',
    items: [
      'Are region and quarter coarse enough as defaults? A full frame listed openly may still be identifiable to someone who knows the local stock. Is private matching with owner approval attractive during underwriting? Should an owner be able to see or exclude a buyer before approving?',
      'Provenance: what do assessors and the steel reuse protocol need to know about the source building, and can the platform attest to it without naming the building?',
      'Market data: is there a version of vacancy and pipeline insight that owners would accept being sold? Is supply data aggregated across five or more organisations still worth buying? This prototype builds neither vacancy nor pipeline insight.',
    ],
  },
  {
    group: 'Next version',
    items: [
      'Should the next version call an AI model for bill ingestion, the agreed starting point? Everything labelled "rule-based" here is a place where that model would go.',
      'Rent premium and rental yield are left out because the figures are unverified. Should they appear as an editable assumption instead?',
    ],
  },
]
