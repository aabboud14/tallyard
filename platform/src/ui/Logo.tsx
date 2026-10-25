// The mark (two beams stacked into a T, in brand green) and the wordmark from PRODUCT_NAME.
import { PRODUCT_NAME } from '../domain/constants'
import { cx } from './cx'

export function LogoMark({ size = 24, className, tone = 'brand' }: { size?: number; className?: string; tone?: 'brand' | 'white' }) {
  const bg = tone === 'white' ? '#ffffff' : '#1f6b53'
  const fg = tone === 'white' ? '#1f6b53' : '#ffffff'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cx('shrink-0', className)}>
      <rect width="32" height="32" rx="8" fill={bg} />
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="#000000" strokeOpacity="0.08" />
      <rect x="7" y="7.5" width="18" height="5" rx="1.25" fill={fg} />
      <rect x="13.5" y="14.5" width="5" height="10" rx="1.25" fill={fg} fillOpacity="0.78" />
    </svg>
  )
}

export function Logo({ size = 'md', className, tone = 'ink', markOnly = false }: { size?: 'sm' | 'md' | 'lg'; className?: string; tone?: 'ink' | 'white'; markOnly?: boolean }) {
  const mark = size === 'sm' ? 20 : size === 'lg' ? 30 : 24
  const text = size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-[21px]' : 'text-[17px]'
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <LogoMark size={mark} tone={tone === 'white' ? 'white' : 'brand'} />
      {markOnly ? <span className="sr-only">{PRODUCT_NAME}</span> : <span className={cx('font-semibold tracking-[-0.02em]', text, tone === 'white' ? 'text-white' : 'text-ink')}>{PRODUCT_NAME}</span>}
    </span>
  )
}
