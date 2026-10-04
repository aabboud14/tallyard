// The public view of a listing, built only from a PublicListing. Used by the marketplace and the owner's market preview.
import type { PublicListing } from '../../domain/types'
import { ItemDrawing } from '../../components/drawings/ItemDrawing'
import { HowCalculated } from '../../components/HowCalculated'
import { Dl, Tag, Note } from '../../components/ui'
import { FAMILIES } from '../../domain/reference/families'
import { facilityById } from '../../domain/reference/assumptions'
import { LABELS, SIGNAL_LABELS, TEST_STATUS_LABELS, GRADE_UNKNOWN, SOURCE_TYPE_LABELS } from '../../domain/reference/labels'
import * as f from '../../domain/format'
import { carbonAvoided } from '../../domain/engines/carbon'
import { guidePrice } from '../../domain/engines/pricing'
import { DEFAULT_ASSUMPTIONS as A } from '../../domain/reference/assumptions'
import { factorQty } from '../../domain/engines/measures'
import { carbonSections, guideSections } from '../shared/calc'

export function availabilityText(l: PublicListing): string {
  return l.availability.kind === 'now' ? 'Available now' : `Available from ${l.availability.label}`
}

export function quantityText(l: PublicListing): string {
  if (l.quantity.pieces !== null && l.family === 'steel_section') return f.quantity(l.quantity.pieces, 'pieces')
  if (l.family === 'curtain_wall') return `${f.quantity(l.quantity.pieces ?? 0, 'panels')} (${f.quantity(l.quantity.value, 'm2')})`
  return f.quantity(l.quantity.value, l.quantity.unit)
}

export function priceRangeText(l: PublicListing): string {
  return `${f.priceOnly(l.price.low, l.family)} to ${f.unitPrice(l.price.high, l.family)}`
}

export function specRows(l: PublicListing): { label: string; value: string }[] {
  const s = l.spec
  switch (s.family) {
    case 'steel_section':
      return [
        { label: 'Designation', value: s.designation },
        { label: 'Length', value: `${s.lengthM.toFixed(1)} m` },
      ]
    case 'curtain_wall':
      return [
        { label: 'System', value: s.system },
        { label: 'Panel', value: `${s.panelWidthM} m by ${s.panelHeightM} m` },
      ]
    case 'precast_cladding':
      return [{ label: 'Thickness', value: `${s.thicknessMm} mm` }]
    case 'stone_cladding':
      return [
        { label: 'Stone', value: s.stone },
        { label: 'Thickness', value: `${s.thicknessMm} mm` },
      ]
    case 'clay_brick':
      return [
        { label: 'Type', value: s.brickType },
        { label: 'Mortar', value: s.mortar },
      ]
    case 'raised_floor':
      return [{ label: 'Panel size', value: `${s.panelSize} mm` }]
    case 'timber_joist':
      return [{ label: 'Species', value: s.species }]
  }
}

export function ListingView({ listing: l, testPrefix = 'listing', compact = false }: { listing: PublicListing; testPrefix?: string; compact?: boolean }) {
  const fam = FAMILIES[l.family]
  // Recompute the panel's breakdown from public fields only: same functions, same inputs.
  const carbon = l.carbon
    ? carbonAvoided({ family: l.family, sourceType: l.sourceType, baselineQty: factorQty(l.family, { units: l.quantity.value, massT: l.massT, pieces: l.quantity.pieces, areaM2: l.family === 'raised_floor' ? l.quantity.value * 0.36 : l.quantity.unit === 'm2' ? l.quantity.value : null, volumeM3: null }), baselineMassT: l.massT, reuseQty: factorQty(l.family, { units: l.quantity.value, massT: l.massT, pieces: l.quantity.pieces, areaM2: l.family === 'raised_floor' ? l.quantity.value * 0.36 : l.quantity.unit === 'm2' ? l.quantity.value : null, volumeM3: null }), reuseMassT: l.massT, reuseKm: A.listingKm }, A)
    : null
  const gp = guidePrice(l.family, l.condition, l.testStatus, l.price.signal, A)
  return (
    <div className={compact ? 'flex flex-col gap-3' : 'grid gap-5 lg:grid-cols-[auto_1fr]'}>
      <div className="flex flex-col items-start gap-2">
        <ItemDrawing spec={l.spec} box={compact ? 90 : 140} caption={false} />
        {l.photos.length ? (
          <div className="flex flex-wrap gap-2">
            {l.photos.map((p) => (p.src ? <img key={p.id} src={p.src} alt="Public photo" className="h-20 w-auto rounded-sm border border-rule" /> : null))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-2xl" data-testid={`${testPrefix}-title`}>
            {l.title}
          </span>
          <Tag tone={l.status === 'Available' ? 'teal' : 'grey'}>{l.status}</Tag>
          {l.sharing === 'in_confidence' ? <Tag tone="steel">{LABELS.L27}</Tag> : null}
        </div>
        <Dl
          testPrefix={testPrefix}
          rows={[
            ...specRows(l).map((r) => ({ label: r.label, value: r.value })),
            { label: 'Quantity', value: quantityText(l), testId: 'quantity' },
            { label: 'Mass', value: f.massT(l.massT), testId: 'mass' },
            { label: 'Condition', value: l.condition, testId: 'condition' },
            { label: 'Test status', value: TEST_STATUS_LABELS[l.testStatus], testId: 'test-status' },
            ...(l.family === 'steel_section' ? [{ label: 'Grade', value: l.grade && l.grade !== 'unknown' ? l.grade : GRADE_UNKNOWN, testId: 'grade' }] : []),
            ...(l.eraBand ? [{ label: 'Era', value: l.eraBand, testId: 'era' }] : []),
            { label: 'Source', value: SOURCE_TYPE_LABELS[l.sourceType], testId: 'source-type' },
            { label: 'Seller', value: l.sellerType, testId: 'seller-type' },
            { label: 'Location', value: l.location.label, testId: 'location' },
            { label: 'Availability', value: availabilityText(l), testId: 'availability' },
            ...(l.collectionHubId ? [{ label: 'Collect from', value: facilityById(l.collectionHubId).name, testId: 'hub' }] : []),
          ]}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm text-mill-text">Guide price</span>
          <span className="font-display text-xl" data-testid={`${testPrefix}-price`}>
            {priceRangeText(l)}
          </span>
          <span data-testid={`${testPrefix}-signal`}>Market signal: {SIGNAL_LABELS[l.price.signal]}</span>
          <span className="text-xs text-mill-text" data-testid="label-L10">{LABELS.L10}</span>
          {!compact ? <HowCalculated title={`guide price for ${l.publicId}`} {...guideSections(gp, l.family, l.condition, l.testStatus)} testId={`${testPrefix}-price-calc`} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm text-mill-text">Avoided carbon</span>
          {l.carbon && carbon ? (
            <>
              <span className="font-display text-xl" data-testid={`${testPrefix}-carbon`}>
                {f.carbon(l.carbon.avoidedT)}
              </span>
              <span className="text-sm text-ink-soft">{f.percent(l.carbon.percent)} of new, A1-A4</span>
              {!compact ? <HowCalculated title={`avoided carbon for ${l.publicId}`} {...carbonSections(carbon)} testId={`${testPrefix}-carbon-calc`} /> : null}
            </>
          ) : (
            <span data-testid={`${testPrefix}-carbon`}>{LABELS.L14}</span>
          )}
        </div>
        <p className="text-sm" data-testid={`${testPrefix}-listed`}>
          Surveyed. Listed {f.month(l.listedMonth)}.
        </p>
        {!compact ? (
          l.family === 'steel_section' ? (
            <Note tone="steel">To reserve steel, match your schedule in the project workspace.</Note>
          ) : (
            <Note tone="grey" testId="label-L25">
              {LABELS.L25}
            </Note>
          )
        ) : null}
        {!compact ? <p className="text-xs text-mill-text">{fam.label}. Public ID {l.publicId}.</p> : null}
      </div>
    </div>
  )
}
