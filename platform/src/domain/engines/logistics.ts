// The logistics agent (02 section 4, rule 14): quotes each haulier for the hub to project leg.
import type { Haulier, Quote } from '../types'
import { roundPence } from '../money'
import { addDays, isOnOrBefore } from '../dates'

export function logisticsQuotes(hauliers: Haulier[], loads: number, km: number, demoDate: string, deliveryDate: string): { quotes: Quote[]; chosen: Quote | null } {
  const quotes: Quote[] = hauliers.map((h) => ({
    haulier: h.name,
    amount: roundPence(loads * (h.fixed + h.perKm * km)),
    noticeDays: h.noticeDays,
    meetsDates: isOnOrBefore(addDays(demoDate, h.noticeDays), deliveryDate),
  }))
  quotes.sort((x, y) => x.amount - y.amount || x.noticeDays - y.noticeDays || x.haulier.localeCompare(y.haulier))
  const chosen = quotes.find((q) => q.meetsDates) ?? null
  return { quotes, chosen }
}
