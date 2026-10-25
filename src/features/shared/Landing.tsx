// Landing: pick a role (brief/09-V1-PRODUCT.md sections 3.6 and 6.4). The architect comes first and leads visually;
// the other roles follow as quiet cards, each with one line on what that role does here.
// The home each card opens comes from the live world through homeFor.
import { useNavigate } from 'react-router'
import { useStore } from '../../store/store'
import { landingGroups, landingShowcase, type LandingGroup, type LandingPersona } from '../../store/views/shared'
import { PRODUCT_NAME } from '../../domain/constants'
import { homeFor } from '../../app/nav'
import { Button, cx } from '../../components/ui'
import { MaterialSwatch } from '../../components/v1'

export function Landing() {
  const world = useStore((s) => s.world)
  const setPersona = useStore((s) => s.setPersona)
  const navigate = useNavigate()
  const groups = landingGroups(world)
  const lead = groups.find((g) => g.role === 'architect') ?? null
  const rest = groups.filter((g) => g !== lead)
  const showcase = landingShowcase(world)
  const open = (personaId: string) => {
    setPersona(personaId)
    navigate(homeFor(world, personaId))
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="max-w-3xl">
        <h1 className="font-display text-5xl leading-none tracking-wide sm:text-6xl">{PRODUCT_NAME}</h1>
        <p className="mt-3 text-lg leading-snug text-ink">A marketplace for salvaged construction materials, with the workflow around it for each role on a project.</p>
        <p className="mt-2 text-sm text-mill-text" data-testid="landing-prototype-line">
          A working prototype, version 1.0, on sample data. Every company, person and building is fictional, and nothing leaves this browser.
        </p>
      </header>

      {lead ? (
        <section className="mt-8 overflow-hidden rounded-md border border-rule-soft bg-panel shadow-[0_12px_32px_-24px_rgba(20,32,43,0.45)]" data-testid={`role-group-${lead.role}`}>
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="flex flex-col gap-4 p-6 sm:p-8">
              <div>
                <p className="text-xs font-medium tracking-wide text-steel">Start here</p>
                <h2 className="mt-1 font-display text-4xl leading-none tracking-wide">{lead.heading}</h2>
              </div>
              <p className="max-w-md text-base leading-relaxed text-ink-soft">{lead.copy}</p>
              <div className="mt-auto flex flex-col gap-2 pt-2">
                {lead.personas.map((p) => (
                  <PersonaButton key={p.id} p={p} onOpen={open} lead />
                ))}
              </div>
            </div>
            {showcase.length > 0 ? (
              <div
                className="grid h-56 grid-cols-2 grid-rows-2 gap-1 bg-rule-soft p-1 sm:h-72 lg:h-full lg:min-h-80"
                aria-label="Illustrations generated from survey records on the marketplace"
                role="group"
              >
                {showcase.map((l, i) => (
                  <MaterialSwatch key={l.publicId} spec={l.spec} publicId={l.publicId} className={cx('!aspect-auto h-full rounded-sm', (i === 0 || showcase.length < 3) && 'row-span-2')} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <h2 className="mt-10 text-xs font-medium tracking-wide text-mill-text">Other roles on a project</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((g) => (
          <RoleGroup key={g.role} g={g} onOpen={open} />
        ))}
        <section className="flex flex-col gap-3 rounded-md border border-dashed border-rule p-5">
          <div>
            <h3 className="text-base font-semibold">For presenters</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">Twelve steps across the roles. Each one opens the right persona and screen, and can be set up from fresh data.</p>
          </div>
          <div className="mt-auto">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              data-testid="landing-open-demo"
              onClick={() => {
                document.querySelector<HTMLButtonElement>('[data-testid="open-demo-script"]')?.click()
              }}
            >
              Open the demo script
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

function RoleGroup({ g, onOpen }: { g: LandingGroup; onOpen: (id: string) => void }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-rule-soft bg-panel p-5" data-testid={`role-group-${g.role}`}>
      <div>
        <h3 className="text-base font-semibold">{g.heading}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{g.copy}</p>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        {g.personas.map((p) => (
          <PersonaButton key={p.id} p={p} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

function PersonaButton({ p, onOpen, lead = false }: { p: LandingPersona; onOpen: (id: string) => void; lead?: boolean }) {
  return (
    <button
      type="button"
      className={cx(
        'flex min-h-[44px] w-full items-center justify-between gap-3 rounded-sm border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-steel',
        lead ? 'border-steel bg-steel px-4 py-3 text-panel hover:bg-steel-deep' : 'border-rule bg-panel px-3 py-2.5 hover:border-steel hover:bg-steel-tint',
      )}
      data-testid={`persona-card-${p.id}`}
      onClick={() => onOpen(p.id)}
    >
      <span className="flex min-w-0 flex-col">
        <span className={cx('font-display leading-tight tracking-wide', lead ? 'text-2xl' : 'text-xl')}>{p.name}</span>
        <span className={cx('text-sm', lead ? 'text-panel/85' : 'text-ink-soft')}>{p.line}</span>
      </span>
      <span className={cx('shrink-0 text-sm font-medium', lead ? 'text-panel' : 'text-steel')}>Open</span>
    </button>
  )
}
