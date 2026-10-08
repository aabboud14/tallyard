// The listing's fact rows, formatted from public fields only. Shared by the listing page and the owner's preview.
import type { PublicListing } from '../../domain/types'
import { facilityById } from '../../domain/reference/assumptions'
import { TEST_STATUS_LABELS, GRADE_UNKNOWN, SOURCE_TYPE_LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { availabilityText, quantityText, specFieldRows } from '../../domain/engines/specSheet'

type Row = { label: string; value: string; testId?: string }

/** Spec fields, then the record facts. `withAmounts` adds quantity and mass (the page shows them as figures instead). */
export function factRows(l: PublicListing, withAmounts: boolean): Row[] {
  return [
    ...specFieldRows(l.spec).map((r) => ({ label: r.label, value: r.value })),
    ...(withAmounts
      ? [
          { label: 'Quantity', value: quantityText(l), testId: 'quantity' },
          { label: 'Mass', value: f.massT(l.massT), testId: 'mass' },
        ]
      : []),
    { label: 'Condition', value: l.condition, testId: 'condition' },
    { label: 'Test status', value: TEST_STATUS_LABELS[l.testStatus], testId: 'test-status' },
    ...(l.family === 'steel_section' ? [{ label: 'Grade', value: l.grade && l.grade !== 'unknown' ? l.grade : GRADE_UNKNOWN, testId: 'grade' }] : []),
    ...(l.eraBand ? [{ label: 'Era', value: l.eraBand, testId: 'era' }] : []),
    { label: 'Source', value: SOURCE_TYPE_LABELS[l.sourceType], testId: 'source-type' },
    { label: 'Seller', value: l.sellerType, testId: 'seller-type' },
    { label: 'Location', value: l.location.label, testId: 'location' },
    { label: 'Availability', value: availabilityText(l), testId: 'availability' },
    ...(l.collectionHubId ? [{ label: 'Collect from', value: facilityById(l.collectionHubId).name, testId: 'hub' }] : []),
  ]
}
