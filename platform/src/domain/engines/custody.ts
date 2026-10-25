// Buyer's custody timeline (02 section 4, rule 15).
import type { CustodyEvent } from '../types'
import { addDays, isOnOrBefore } from '../dates'

export const TESTING_DAYS_AFTER_HANDOVER = 14

export function buyerCustody(dealDate: string, handoverDate: string, testing: boolean, deliveryDate: string | null, demoDate: string): CustodyEvent[] {
  const ev = (id: string, label: string, date: string): CustodyEvent => ({ id, label, date, done: isOnOrBefore(date, demoDate) })
  const out = [ev('agreed', 'Agreed', dealDate), ev('handover', 'Handover at hub', handoverDate)]
  if (testing) out.push(ev('tested', 'Tested', addDays(handoverDate, TESTING_DAYS_AFTER_HANDOVER)))
  if (deliveryDate) out.push(ev('delivered', 'Delivered', deliveryDate))
  return out
}
