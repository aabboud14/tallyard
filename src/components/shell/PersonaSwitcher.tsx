import { useNavigate } from 'react-router'
import { useStore } from '../../store/store'
import { WORKSPACES } from '../../app/workspaces'

export function PersonaSwitcher() {
  const personaId = useStore((s) => s.personaId)
  const personas = useStore((s) => s.world.personas)
  const orgs = useStore((s) => s.world.orgs)
  const setPersona = useStore((s) => s.setPersona)
  const navigate = useNavigate()
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="text-mill-text">Persona</span>
      <select
        className="min-h-9 max-w-[calc(100vw-120px)] rounded-sm border border-rule bg-panel px-2 text-sm sm:max-w-md"
        value={personaId}
        data-testid="persona-switcher"
        onChange={(e) => {
          const id = e.target.value
          setPersona(id)
          navigate(WORKSPACES[id].home)
        }}
      >
        {Object.values(personas).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}, {orgs[p.orgId].name}, {p.role}
          </option>
        ))}
      </select>
    </label>
  )
}
