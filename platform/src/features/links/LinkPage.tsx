// A share link (/app/links/:linkId), for anyone signed in. A donor building owner shares some lots by link; whoever
// opens it first accepts the confidentiality terms, then sees the lots as anonymous public listings. The owner's own
// organisation sees a preview. A revoked or unknown link reads as no longer active.
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { Eye, House, LockKeyhole, ShieldCheck } from 'lucide-react'
import * as f from '../../domain/format'
import { act, useSession, useView } from '../../store'
import { LINK_PAGE_TITLES, linkView } from '../../store/selectors/links'
import type { ListingCard } from '../../store/selectors/common'
import { Button, Callout, Card, DescriptionList, EmptyState, IndicativeMarker, MaterialCard, MaterialImage, PageHeader, Sheet, SustainabilityBand, toast } from '../../ui'
import { Page } from '../../app/Page'
import { ListingTile } from '../discover/ListingTile'
import { usePhotoSrc } from '../discover/photo'

export function LinkPage() {
  const { linkId = '' } = useParams()
  const v = useView(linkView, linkId)
  const { role } = useSession()
  const [busy, setBusy] = useState(false)
  if (!v) return null
  if (v.state === 'inactive')
    return (
      <Page testId="link-page" width="narrow">
        <EmptyState
          variant="page"
          illustration="inbox"
          title="This link is no longer active"
          text="The owner withdrew it, or the address is not right. Anything you saved from it shows as no longer shared."
          action={
            <Button asChild variant="primary" icon={House}>
              <Link to="/app/home">Go home</Link>
            </Button>
          }
          testId="link-inactive"
        />
      </Page>
    )
  if (v.state === 'terms') {
    const accept = () => {
      setBusy(true)
      const r = act.openShareLink(linkId)
      setBusy(false)
      if (!r.ok) toast.error(r.error ?? 'Could not open the link.')
    }
    return (
      <Page testId="link-page" width="narrow">
        <Card padding="lg" className="mx-auto mt-6 flex max-w-xl flex-col gap-5" data-testid="link-terms">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h1 className="m-0 text-xl font-semibold text-ink">Shared in confidence</h1>
            <p className="m-0 mt-2 text-base text-ink-soft">
              A donor building owner shared {v.count} {v.count === 1 ? 'lot' : 'lots'} with you. Accept to see them, and agree not to pass the details on. The owner sees only the type of your organisation.
            </p>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-ink-soft">
            <li className="flex items-start gap-2">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-600" />
              You see each lot as an anonymous listing. The building and its owner are never named.
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-600" />
              The owner can withdraw the link at any time.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={accept} loading={busy} data-testid="link-accept">
              Accept and view
            </Button>
            <Button asChild variant="ghost">
              <Link to="/app/home">Not now</Link>
            </Button>
          </div>
        </Card>
      </Page>
    )
  }
  const preview = v.state === 'preview'
  const materialLinks = v.state === 'open' && v.materialLinks
  return (
    <Page testId="link-page" width="wide">
      <PageHeader title={preview ? LINK_PAGE_TITLES.preview : LINK_PAGE_TITLES.other} subtitle={`${v.count} ${v.count === 1 ? 'lot' : 'lots'}, shared in confidence by a donor building owner.`} />
      {preview ? (
        <Callout icon={Eye} className="mt-5" role="status">
          This is how people with the link see your lots.
        </Callout>
      ) : null}
      {v.cards.length === 0 ? (
        <EmptyState variant="page" illustration="materials" title="No lots to show" text="The lots in this link are no longer shared or have been reserved." />
      ) : (
        <ul className="m-0 mt-6 grid list-none grid-cols-1 gap-x-5 gap-y-8 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="link-cards">
          {v.cards.map((c) => (
            <li key={c.publicId} className="min-w-0">
              {materialLinks ? (
                <ListingTile card={c} canSave={role === 'architect'} />
              ) : preview ? (
                // The same card openers see, badges and short dates included; it opens the facts here, not the marketplace.
                <ListingTile card={c} canSave={false} href={`?card=${c.publicId}`} />
              ) : (
                <FactsTile card={c} />
              )}
            </li>
          ))}
        </ul>
      )}
      {materialLinks ? null : <FactsSheet cards={v.cards} />}
    </Page>
  )
}

/** A card for people with no material page to open: it opens the facts in a sheet. */
function FactsTile({ card }: { card: ListingCard }) {
  const photo = usePhotoSrc(card.photo)
  return (
    <MaterialCard
      testId={`card-${card.publicId}`}
      href={`?card=${card.publicId}`}
      title={card.title}
      eyebrow={`${card.typologyLabel}, ${card.familyLabel}`}
      image={<MaterialImage spec={card.listing.spec} publicId={card.publicId} photo={photo} alt={`Photo of ${card.title}`} aspect="4/3" />}
      facts={[card.quantityText, card.availabilityText, card.locationLabel]}
      band={card.band}
    />
  )
}

function FactsSheet({ cards }: { cards: ListingCard[] }) {
  const [params, setParams] = useSearchParams()
  const id = params.get('card')
  const card = cards.find((c) => c.publicId === id) ?? null
  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('card')
    setParams(next, { replace: true })
  }
  return (
    <Sheet open={!!card} onOpenChange={(o) => !o && close()} title={card?.title ?? ''} description={card ? `${card.typologyLabel}, ${card.familyLabel}` : undefined} testId="link-card-sheet">
      {card ? (
        <div className="flex flex-col gap-5">
          <MaterialImage spec={card.listing.spec} publicId={card.publicId} photo={null} alt={`Illustration of ${card.title}`} aspect="4/3" />
          <DescriptionList
            items={[
              { label: 'Quantity', value: card.quantityText, hint: f.massT(card.massT) },
              { label: 'Availability', value: card.availabilityText },
              { label: 'Location', value: card.locationLabel },
              { label: 'Collection', value: card.collectionPoint },
            ]}
          />
          <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-4">
            <div>
              <p className="m-0 text-sm text-muted">Avoided carbon if reused</p>
              <p className="m-0 mt-0.5 text-lg font-semibold tabular-nums text-ink">{card.avoidedT === null ? 'Not claimed' : `${f.number(card.avoidedT, 1)} tCO2e`}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <SustainabilityBand band={card.band} showLabel />
              <IndicativeMarker />
            </div>
          </div>
        </div>
      ) : null}
    </Sheet>
  )
}

export default LinkPage
