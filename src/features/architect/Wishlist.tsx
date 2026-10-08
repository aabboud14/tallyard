// Placeholder from the version 1.0 shell. The screen's owner replaces the body; the file and export name are fixed by routes.tsx.
import { PageTitle } from '../../components/ui'

export function Wishlist() {
  return (
    <div data-testid="placeholder-wishlist">
      <PageTitle title="Wish list" />
      <p className="max-w-2xl text-sm text-ink-soft">The materials saved to this project, with timing against the start date, the sustainability band and avoided carbon, ready to send to the client.</p>
    </div>
  )
}
