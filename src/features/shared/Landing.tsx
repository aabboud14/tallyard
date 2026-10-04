import { useNavigate } from 'react-router'
import { useStore } from '../../store/store'
import { PRODUCT_NAME } from '../../domain/constants'
import { WORKSPACES } from '../../app/workspaces'
import { Button } from '../../components/ui'

export function Landing() {
  const personas = useStore((s) => s.world.personas)
  const orgs = useStore((s) => s.world.orgs)
  const setPersona = useStore((s) => s.setPersona)
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-5xl leading-none">{PRODUCT_NAME}</h1>
      <p className="mt-2 max-w-2xl text-base">A marketplace for salvaged construction materials, with the data and tools around it for reuse planning and sustainability reporting. Prototype v0.5 on sample data.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(personas).map((p) => {
          const ws = WORKSPACES[p.id]
          return (
            <button
              key={p.id}
              type="button"
              className="flex flex-col items-start gap-1 rounded-sm border border-rule bg-panel p-4 text-left hover:border-steel"
              data-testid={`persona-card-${p.id}`}
              onClick={() => {
                setPersona(p.id)
                navigate(ws.home)
              }}
            >
              <span className="font-display text-xl">{p.name}</span>
              <span className="text-sm text-ink-soft">
                {orgs[p.orgId].name}, {p.role}
              </span>
              <span className="mt-1 text-xs text-mill-text">{ws.sees}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-6">
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
