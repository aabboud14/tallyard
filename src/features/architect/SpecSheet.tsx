// Placeholder from the version 1.0 shell. The screen's owner replaces the body; the file and export name are fixed by routes.tsx.
import { PageTitle } from '../../components/ui'

export function SpecSheet() {
  return (
    <div data-testid="placeholder-spec-sheet">
      <PageTitle title="Spec sheet" />
      <p className="max-w-2xl text-sm text-ink-soft">A specification schedule of this project's approved materials, with a spreadsheet export and a printable page.</p>
    </div>
  )
}
