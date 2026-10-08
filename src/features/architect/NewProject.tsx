// New project (brief/09-V1-PRODUCT.md sections 3.3 and 13.6): a short form that calls createProject and opens the
// new project's wish list. The rules live in createProject; the form shows its message beside the field it concerns.
import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useStore } from '../../store/store'
import { V1_ERRORS } from '../../store/v1actions'
import { clientSuggestions, newProjectErrorField, REGION_OPTIONS, type NewProjectField } from '../../store/views/architectProject'
import type { ProjectType } from '../../domain/v1types'
import { DEMO_TODAY } from '../../domain/constants'
import { PROJECT_TYPE_LABELS } from '../../domain/reference/labels'
import { Button, cx, inputClass, selectClass } from '../../components/ui'
import { ChipGroup } from '../../components/v1'

const TYPES: ProjectType[] = ['office', 'hotel', 'residential', 'other']

export function NewProject() {
  const world = useStore((s) => s.world)
  const personaId = useStore((s) => s.personaId)
  const createProject = useStore((s) => s.createProject)
  const navigate = useNavigate()
  const uid = useId()
  const suggestions = useMemo(() => clientSuggestions(world, personaId), [world, personaId])
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [projectType, setProjectType] = useState<ProjectType | null>(null)
  const [localAuthority, setLocalAuthority] = useState('')
  const [region, setRegion] = useState('')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState<{ field: NewProjectField | null; text: string } | null>(null)
  const refs = useRef<Partial<Record<NewProjectField, HTMLElement | null>>>({})

  const fail = (text: string) => {
    const field = newProjectErrorField(text)
    setError({ field, text })
    if (field) refs.current[field]?.focus()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (projectType === null) {
      // The order matches createProject: name and client are checked before the type.
      if (!name.trim()) return fail(V1_ERRORS.name)
      if (!clientName.trim()) return fail(V1_ERRORS.clientName)
      return fail(V1_ERRORS.projectType)
    }
    const r = createProject({ name, clientName, projectType, localAuthority, region, startDate })
    if (r.error || !r.projectId) return fail(r.error ?? V1_ERRORS.noProject)
    setError(null)
    navigate(`/projects/${r.projectId}/wishlist`)
  }

  const id = (f: NewProjectField) => `${uid}-${f}`
  const errorFor = (f: NewProjectField) => (error?.field === f ? error.text : null)
  const described = (f: NewProjectField, hint: boolean) => [hint ? `${id(f)}-hint` : '', errorFor(f) ? `${id(f)}-error` : ''].filter(Boolean).join(' ') || undefined

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6" data-testid="new-project">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-mill-text">Projects</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">New project</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">A project gets its own folder and wish list. The date materials are needed on site drives the timeline check on every item you save to it.</p>
      </header>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5 rounded-md border border-rule-soft bg-panel px-5 py-6 sm:px-8 sm:py-7" data-testid="new-project-form">
        {error && error.field === null ? (
          <p role="alert" className="m-0 rounded-sm border-l-2 border-oxide bg-oxide-tint px-3 py-2 text-sm" data-testid="new-project-error">
            {error.text}
          </p>
        ) : null}

        <Row label="Project name" htmlFor={id('name')} error={errorFor('name')} errorId={`${id('name')}-error`}>
          <input
            id={id('name')}
            ref={(el) => {
              refs.current.name = el
            }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            aria-invalid={errorFor('name') ? true : undefined}
            aria-describedby={described('name', false)}
            className={cx(inputClass, errorFor('name') && 'border-oxide')}
            data-testid="new-project-name"
          />
        </Row>

        <Row label="Client" htmlFor={id('clientName')} hint="The organisation that approves and buys. Type a new name to add one." hintId={`${id('clientName')}-hint`} error={errorFor('clientName')} errorId={`${id('clientName')}-error`}>
          <input
            id={id('clientName')}
            ref={(el) => {
              refs.current.clientName = el
            }}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            list={suggestions.length ? `${uid}-clients` : undefined}
            autoComplete="off"
            aria-invalid={errorFor('clientName') ? true : undefined}
            aria-describedby={described('clientName', true)}
            className={cx(inputClass, errorFor('clientName') && 'border-oxide')}
            data-testid="new-project-client"
          />
          {suggestions.length ? (
            <datalist id={`${uid}-clients`}>
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          ) : null}
        </Row>

        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0" aria-describedby={errorFor('projectType') ? `${id('projectType')}-error` : undefined}>
          <legend className="mb-1.5 p-0 text-sm font-medium">Project type</legend>
          <div
            ref={(el) => {
              refs.current.projectType = el
            }}
            tabIndex={-1}
            className="outline-none"
          >
            <ChipGroup<ProjectType | null> className="[&>[aria-pressed=true]]:text-panel" ariaLabel="Project type" testId="new-project-type" value={projectType} onChange={(v) => setProjectType(v)} options={TYPES.map((t) => ({ value: t, label: PROJECT_TYPE_LABELS[t] }))} />
          </div>
          {errorFor('projectType') ? <FieldError id={`${id('projectType')}-error`}>{errorFor('projectType')}</FieldError> : null}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Row label="Local authority" htmlFor={id('localAuthority')} hint="Optional." hintId={`${id('localAuthority')}-hint`} error={errorFor('localAuthority')} errorId={`${id('localAuthority')}-error`}>
            <input
              id={id('localAuthority')}
              ref={(el) => {
                refs.current.localAuthority = el
              }}
              value={localAuthority}
              onChange={(e) => setLocalAuthority(e.target.value)}
              autoComplete="off"
              aria-describedby={described('localAuthority', true)}
              className={inputClass}
              data-testid="new-project-local-authority"
            />
          </Row>

          <Row label="Region" htmlFor={id('region')} error={errorFor('region')} errorId={`${id('region')}-error`}>
            <select
              id={id('region')}
              ref={(el) => {
                refs.current.region = el
              }}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-invalid={errorFor('region') ? true : undefined}
              aria-describedby={described('region', false)}
              className={cx(selectClass, errorFor('region') && 'border-oxide', region === '' && 'text-mill-text')}
              data-testid="new-project-region"
            >
              <option value="">Choose a region</option>
              {REGION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Row>
        </div>

        <Row label="Materials needed on site from" htmlFor={id('startDate')} hint="The timeline check on each wish list item counts to this date." hintId={`${id('startDate')}-hint`} error={errorFor('startDate')} errorId={`${id('startDate')}-error`}>
          <input
            id={id('startDate')}
            ref={(el) => {
              refs.current.startDate = el
            }}
            type="date"
            min={DEMO_TODAY}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-invalid={errorFor('startDate') ? true : undefined}
            aria-describedby={described('startDate', true)}
            className={cx(inputClass, 'sm:max-w-[16rem]', errorFor('startDate') && 'border-oxide')}
            data-testid="new-project-start"
          />
        </Row>

        <div className="flex flex-wrap items-center gap-2 border-t border-rule-soft pt-5">
          <Button type="submit" variant="primary" size="lg" className="text-panel" data-testid="new-project-create">
            Create project
          </Button>
          <Link to="/market" className="inline-flex min-h-[44px] items-center rounded-sm px-4 text-sm font-medium text-steel no-underline hover:bg-steel-tint" data-testid="new-project-cancel">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

function Row({ label, htmlFor, hint, hintId, error, errorId, children }: { label: string; htmlFor: string; hint?: string; hintId?: string; error: string | null; errorId: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? (
        <span id={hintId} className="text-xs text-mill-text">
          {hint}
        </span>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} role="alert" className="text-sm font-medium text-oxide" data-testid="new-project-field-error">
      {children}
    </span>
  )
}
