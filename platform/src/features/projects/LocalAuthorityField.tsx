// The location fields of the project forms. The region dropdown is grouped London, the rest of England, then Wales
// and Scotland, with a line naming the boroughs a London region covers. The local authority dropdown lists every
// listed authority grouped by region, this region first, so a borough can be found without knowing which region it
// sits in: choosing one sets the region too. Outside London 'Another local authority' takes a typed name. Optional;
// an empty value is always valid.
import { useState } from 'react'
import { regionOfLocalAuthority } from '../../domain/reference/places'
import { localAuthorityChoices, regionChoices, typedLocalAuthorityNote } from '../../store/selectors/project'
import { Field, Input, Select } from '../../ui'

const OTHER = '__other__'

export type Place = { region: string; localAuthority: string }

type RegionProps = { region: string; onChange: (place: Place) => void; error?: string; className?: string; testId?: string; required?: boolean; placeholder?: string }

/** The region dropdown. A new region clears the local authority, which belongs to one region. */
export function RegionField({ region, onChange, error, className, testId = 'project-region', required, placeholder }: RegionProps) {
  const choices = regionChoices(region)
  return (
    <Field label="Region" required={required} error={error} hint={choices.hint ?? undefined} className={className}>
      <Select
        value={region}
        placeholder={placeholder}
        onChange={(e) => onChange({ region: e.target.value, localAuthority: '' })}
        options={choices.groups.flatMap((g) => g.items.map((r) => ({ value: r, label: r, group: g.label })))}
        data-testid={testId}
      />
    </Field>
  )
}

type Props = { region: string; value: string; onChange: (place: Place) => void; error?: string; className?: string; testId?: string }

export function LocalAuthorityField({ region, value, onChange, error, className, testId = 'project-local-authority' }: Props) {
  const choices = localAuthorityChoices(region)
  const listed = choices.options.includes(value)
  const [typing, setTyping] = useState(() => value !== '' && !listed)
  const other = choices.allowsOther && (typing || (value !== '' && !listed))
  const options = choices.groups.flatMap((g, i) => [
    ...g.items.map((o) => ({ value: o, label: o, group: g.label })),
    // A typed name belongs to this region, so the choice closes the first group.
    ...(i === 0 && choices.allowsOther ? [{ value: OTHER, label: 'Another local authority', group: g.label }] : []),
  ])
  return (
    <div className={className}>
      <Field label="Local authority" optional error={other ? undefined : error} hint="Grouped by region. Choosing one sets the region.">
        <Select
          value={other ? OTHER : listed ? value : ''}
          placeholder="Choose a local authority"
          options={options}
          onChange={(e) => {
            const v = e.target.value
            if (v === OTHER) {
              setTyping(true)
              onChange({ region, localAuthority: '' })
            } else {
              setTyping(false)
              onChange({ region: v ? (regionOfLocalAuthority(v) ?? region) : region, localAuthority: v })
            }
          }}
          data-testid={testId}
        />
      </Field>
      {other ? (
        <Field label="Local authority name" error={error} className="mt-3" hint={typedLocalAuthorityNote(region, value) ?? `In ${region}.`}>
          <Input value={value} onChange={(e) => onChange({ region, localAuthority: e.target.value })} placeholder="For example, St Albans" maxLength={80} autoFocus data-testid={`${testId}-other`} />
        </Field>
      ) : null}
    </div>
  )
}
