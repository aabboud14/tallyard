// A month as two selects, month and year, which works the same in every browser and on a phone.
import { MONTH_NAMES, monthKeyOf } from '../../store/selectors/roles-capture'
import { cx, Select } from '../../ui'

export function MonthPicker({ value, years, onChange, idPrefix, disabled = false, className }: { value: string; years: number[]; onChange: (key: string) => void; idPrefix: string; disabled?: boolean; className?: string }) {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const yearList = years.includes(year) ? years : [...years, year].sort()
  return (
    <div className={cx('grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2', className)}>
      <Select id={`${idPrefix}-month`} aria-label="Month" disabled={disabled} value={String(month)} onChange={(e) => onChange(monthKeyOf(year, Number(e.target.value)))} options={MONTH_NAMES.map((m, i) => ({ value: String(i + 1), label: m }))} data-testid={`${idPrefix}-month`} />
      <Select id={`${idPrefix}-year`} aria-label="Year" disabled={disabled} value={String(year)} onChange={(e) => onChange(monthKeyOf(Number(e.target.value), month))} options={yearList.map((y) => ({ value: String(y), label: String(y) }))} data-testid={`${idPrefix}-year`} />
    </div>
  )
}
