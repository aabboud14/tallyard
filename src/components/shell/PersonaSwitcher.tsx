// The presenter's persona switcher, grouped by role with each persona's organisation. Picking a persona opens that role's home.
import { useNavigate } from 'react-router'
import { useStore } from '../../store/store'
import { homeFor, roleFor, roleTitle, ROLE_ORDER } from '../../app/nav'
import type { Persona } from '../../domain/types'

export function PersonaSwitcher() {
  const personaId = useStore((s) => s.personaId)
  const world = useStore((s) => s.world)
  const setPersona = useStore((s) => s.setPersona)
  const navigate = useNavigate()
  const groups: { label: string; personas: Persona[] }[] = []
  for (const role of ROLE_ORDER) {
    const personas = Object.values(world.personas).filter((p) => roleFor(world, p.id) === role)
    if (personas.length) groups.push({ label: roleTitle(world, personas[0].id), personas })
  }
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm sm:flex-none">
      <span className="shrink-0 text-mill-text">Persona</span>
      <select
        className="min-h-[44px] min-w-0 flex-1 rounded-sm border border-rule bg-panel px-2 text-sm text-ink hover:border-mill focus:border-steel sm:w-80 sm:flex-none lg:min-h-9"
        value={personaId}
        data-testid="persona-switcher"
        onChange={(e) => {
          const id = e.target.value
          setPersona(id)
          navigate(homeFor(world, id))
        }}
      >
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}, {world.orgs[p.orgId]?.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
