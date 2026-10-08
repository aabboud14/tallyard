// Placeholder from the version 1.0 shell. The screen's owner replaces the body; the file and export name are fixed by routes.tsx.
import { PageTitle, Note } from '../../components/ui'
import { LABELS } from '../../domain/reference/labels'

export function MatchV2() {
  return (
    <div data-testid="placeholder-match-v2">
      <PageTitle title="Match schedule" />
      <p className="max-w-2xl text-sm text-ink-soft">Matching a BIM model or a steel schedule against the whole marketplace, shown here as a version 2 feature.</p>
      <Note className="mt-3 max-w-2xl" testId="label-L35">
        {LABELS.L35}
      </Note>
    </div>
  )
}
