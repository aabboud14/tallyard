// Hand-built SVG charts: bullet, stacked horizontal bar, simple bars.
export function BulletChart({ value, target, secondary, max, label, valueLabel, targetLabel, secondaryLabel, testId }: { value: number; target: number; secondary?: number; max: number; label: string; valueLabel: string; targetLabel: string; secondaryLabel?: string; testId?: string }) {
  const W = 520
  const H = 54
  const barY = 18
  const barH = 18
  const x = (v: number) => (Math.min(v, max) / max) * W
  const met = value >= target
  return (
    <figure className="m-0" data-testid={testId}>
      <figcaption className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-mill-text">{label}</span>
        <span className="font-display text-2xl">{valueLabel}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${label}: ${valueLabel} against ${targetLabel}`}>
        <rect x={0} y={barY} width={W} height={barH} fill="#E6EBEF" />
        {secondary !== undefined ? <rect x={0} y={barY} width={x(secondary)} height={barH} fill="#C9D8E4" /> : null}
        <rect x={0} y={barY + 4} width={x(value)} height={barH - 8} fill={met ? '#2E7D6B' : '#2C5E86'} />
        <line x1={x(target)} y1={barY - 6} x2={x(target)} y2={barY + barH + 6} stroke="#14202B" strokeWidth="2" />
        <text x={Math.min(x(target) + 4, W - 80)} y={H - 4} fontSize="11" fill="#5A6873" fontFamily="'IBM Plex Sans', sans-serif">
          {targetLabel}
        </text>
        {secondary !== undefined && secondaryLabel ? (
          <text x={0} y={H - 4} fontSize="11" fill="#5A6873" fontFamily="'IBM Plex Sans', sans-serif">
            {secondaryLabel}
          </text>
        ) : null}
      </svg>
    </figure>
  )
}

const BAR_COLOURS = ['#2E7D6B', '#5AA08E', '#2C5E86', '#7FA3C0', '#F4C20D', '#A63A22', '#7B8A97']

export function StackedBar({ parts, total, formatValue, label }: { parts: { id: string; label: string; value: number }[]; total: number; formatValue: (v: number) => string; label: string }) {
  const W = 640
  const H = 26
  let x = 0
  const shown = parts.filter((p) => p.value > 0)
  return (
    <figure className="m-0">
      <figcaption className="mb-1 text-sm text-mill-text">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={label}>
        {shown.map((p, i) => {
          const w = total > 0 ? (p.value / total) * W : 0
          const el = <rect key={p.id} x={x} y={0} width={w} height={H} fill={BAR_COLOURS[i % BAR_COLOURS.length]} />
          x += w
          return el
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {shown.map((p, i) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3" style={{ background: BAR_COLOURS[i % BAR_COLOURS.length] }} aria-hidden="true" />
            <span>
              {p.label}: {formatValue(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  )
}

export function ScoreBar({ parts, max = 100, width = 160 }: { parts: { id: string; value: number }[]; max?: number; width?: number }) {
  const H = 12
  let x = 0
  const colours: Record<string, string> = { netValue: '#2C5E86', carbon: '#2E7D6B', demand: '#F4C20D', ease: '#7B8A97' }
  return (
    <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} aria-hidden="true">
      <rect x={0} y={0} width={width} height={H} fill="#E6EBEF" />
      {parts.map((p) => {
        const w = (Math.max(0, p.value) / max) * width
        const el = <rect key={p.id} x={x} y={0} width={w} height={H} fill={colours[p.id] ?? '#2C5E86'} />
        x += w
        return el
      })}
    </svg>
  )
}
