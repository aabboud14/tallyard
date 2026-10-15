// The local authority dropdown, filtered by region: the listed authorities, and outside London 'Another local
// authority', which takes a typed name. Optional; an empty value is always valid.
import { useState } from 'react'
import { localAuthorityChoices } from '../../store/selectors/project'
import { Field, Input, Select } from '../../ui'

const OTHER = '__other__'

type Props = { region: string; value: string; onChange: (value: string) => void; error?: string; className?: string; testId?: string }

export function LocalAuthorityField({ region, value, onChange, error, className, testId = 'project-local-authority' }: Props) {
  const choices = localAuthorityChoices(region)
  const listed = choices.options.includes(value)
  const [typing, setTyping] = useState(() => value !== '' && !listed)
  const other = choices.allowsOther && (typing || (value !== '' && !listed))
  return (
    <div className={className}>
      <Field label="Local authority" optional error={other ? undefined : error} hint={choices.london ? 'London boroughs in this region.' : undefined}>
        <Select
          value={other ? OTHER : listed ? value : ''}
          placeholder="Choose a local authority"
          options={[...choices.options.map((o) => ({ value: o, label: o })), ...(choices.allowsOther ? [{ value: OTHER, label: 'Another local authority' }] : [])]}
          onChange={(e) => {
            const v = e.target.value
            if (v === OTHER) {
              setTyping(true)
              onChange('')
            } else {
              setTyping(false)
              onChange(v)
            }
          }}
          data-testid={testId}
        />
      </Field>
      {other ? (
        <Field label="Local authority name" error={error} className="mt-3">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="For example, St Albans" maxLength={80} autoFocus data-testid={`${testId}-other`} />
        </Field>
      ) : null}
    </div>
  )
}
