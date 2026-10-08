// Landing: pick a role. Cards are grouped by role, each with one line on what that role does here (brief 09 section 3.6).
// The home each card opens comes from the live world through homeFor.
import { useNavigate } from 'react-router'
import { useStore } from '../../store/store'
import { PRODUCT_NAME } from '../../domain/constants'
import { ROLE_COPY } from '../../app/workspaces'
import { homeFor, roleFor, roleTitle, ROLE_ORDER } from '../../app/nav'
import { Button } from '../../components/ui'
import type { Persona } from '../../domain/types'

export function Landing() {
  const world = useStore((s) => s.world)
  const setPersona = useStore((s) => s.setPersona)
  const navigate = useNavigate()
  const groups = ROLE_ORDER.map((role) => ({ role, personas: Object.values(world.personas).filter((p) => roleFor(world, p.id) === role) })).filter((g) => g.personas.length > 0)
  const open = (p: Persona) => {
    setPersona(p.id)
    navigate(homeFor(world, p.id))
  }
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-5xl leading-none">{PRODUCT_NAME}</h1>
      <p className="mt-2 max-w-2xl text-base">A marketplace for salvaged construction materials, with the workflow around it for each role on a project. Prototype version 1.0 on sample data.</p>
      <div className="mt-8 grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.role} className="flex flex-col gap-2" data-testid={`role-group-${g.role}`}>
            <h2 className="text-xs font-medium tracking-wide text-mill-text">{roleTitle(world, g.personas[0].id)}</h2>
            <p className="text-sm text-ink-soft">{ROLE_COPY[g.role]}</p>
            {g.personas.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex min-h-[44px] flex-col items-start gap-1 rounded-sm border border-rule bg-panel p-4 text-left hover:border-steel focus-visible:outline-2 focus-visible:outline-steel"
                data-testid={`persona-card-${p.id}`}
                onClick={() => open(p)}
              >
                <span className="font-display text-xl">{p.name}</span>
                <span className="text-sm text-ink-soft">
                  {world.orgs[p.orgId]?.name}, {p.role}
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
      <div className="mt-8">
        <Button
          variant="primary"
          size="lg"
          data-testid="landing-open-demo"
          onClick={() => {
            document.querySelector<HTMLButtonElement>('[data-testid="open-demo-script"]')?.click()
          }}
        >
          Open the demo script
        </Button>
      </div>
    </div>
  )
}
