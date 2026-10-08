// Matching, version 2: shown so people see where the product is going, and does nothing else (09 section 3.3).
import { Link, useParams } from 'react-router'
import { Boxes, Compass, FileSpreadsheet, LockKeyhole, ScanSearch, Upload } from 'lucide-react'
import { LABELS } from '../../domain/reference/labels'
import { Button, Card } from '../../ui'
import { discoverHref } from '../discover/links'
import { ProjectPage } from './ProjectParts'

const STEPS = [
  { icon: Upload, title: 'Upload a model or schedule', text: 'An IFC model, or a steel schedule as a spreadsheet.' },
  { icon: ScanSearch, title: 'Match against the marketplace', text: 'Every member is checked against open and shared lots, by section, length and grade.' },
  { icon: Boxes, title: 'Shortlist the matches', text: 'Matches land on the shortlist with their timeline check, ready to send.' },
]

export function Matching() {
  const { projectId = '' } = useParams()
  return (
    <ProjectPage testId="project-matching">
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5 p-6 sm:p-8">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-inset ring-line">
              <LockKeyhole aria-hidden="true" className="size-3" />
              Version 2
            </span>
            <div>
              <h2 className="m-0 text-xl font-semibold text-ink">Match a whole design against the marketplace</h2>
              <p className="m-0 mt-2 max-w-lg text-base text-ink-soft">Upload a BIM model or a steel schedule and match it against the whole marketplace.</p>
              <p className="m-0 mt-2 text-sm text-muted">{LABELS.L35}</p>
            </div>
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {STEPS.map((s) => (
                <li key={s.title} className="flex items-start gap-3">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-muted ring-1 ring-inset ring-line-soft">
                    <s.icon aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="m-0 font-medium text-ink">{s.title}</p>
                    <p className="m-0 text-sm text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="primary" icon={Compass}>
                <Link to={discoverHref(projectId)}>Find materials by hand</Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center border-t border-line-soft bg-page p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div aria-disabled="true" className="flex w-full max-w-sm cursor-not-allowed flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center opacity-80" data-testid="matching-dropzone">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-subtle text-faint ring-1 ring-inset ring-line">
                <FileSpreadsheet aria-hidden="true" className="size-5" />
              </span>
              <p className="m-0 font-medium text-ink-soft">Drop an IFC model or steel schedule</p>
              <p className="m-0 text-sm text-muted">Not available in this release</p>
            </div>
          </div>
        </div>
      </Card>
    </ProjectPage>
  )
}
