// Status of a tracked requirement, certification credit or measure: a pill that reads the status in words, and
// a select for the people who can change it. Statuses: Not started, In progress, At risk, Evidence ready and
// Not applicable. The words and tones live in labels.ts (TRACK_STATUS), so every screen reads the same.
import { cx } from './cx'
import { Pill, type PillVariant } from './Badge'
import { Select } from './form'
import { TRACK_STATUS, TRACK_STATUS_ORDER, type TrackStatusKey } from './labels'

export function TrackStatusPill({ status, size = 'sm', variant = 'soft', className, testId }: { status: TrackStatusKey; size?: 'sm' | 'md'; variant?: PillVariant; className?: string; testId?: string }) {
  const t = TRACK_STATUS[status]
  return (
    <Pill tone={t.tone} icon={t.icon} size={size} variant={variant} className={className} data-status={status} data-testid={testId}>
      {t.label}
    </Pill>
  )
}

export type TrackStatusSelectProps = {
  value: TrackStatusKey
  onChange: (next: TrackStatusKey) => void
  /** The accessible name, for example "Status of Policy SI 7". */
  label: string
  /** The choices offered, in order. Defaults to all five. */
  options?: readonly TrackStatusKey[]
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
  testId?: string
}

/** A compact status select. Pass `options` without not_applicable where a status cannot be set aside. */
export function TrackStatusSelect({ value, onChange, label, options = TRACK_STATUS_ORDER, disabled = false, size = 'sm', className, testId }: TrackStatusSelectProps) {
  return (
    <Select
      aria-label={label}
      data-testid={testId}
      value={value}
      disabled={disabled}
      selectSize={size}
      className={cx('w-auto min-w-[10rem]', className)}
      onChange={(e) => {
        const next = e.target.value as TrackStatusKey
        if (next in TRACK_STATUS) onChange(next)
      }}
      options={options.map((o) => ({ value: o, label: TRACK_STATUS[o].label }))}
    />
  )
}
