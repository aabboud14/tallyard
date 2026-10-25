// The four headline figures on the client's home: indicative cost by stage, the saving against buying new, avoided
// carbon secured against the projects' targets, and reuse by value with content by value against the project aim on
// its own line. Each is indicative; states come from the store.
import { Leaf, PiggyBank, Recycle, Wallet } from 'lucide-react'
import type { ClientHomeView } from '../../../store/selectors/sustainability-screens'
import * as f from '../../../domain/format'
import { Donut, Legend, MetricGrid, MetricTile, ProgressBar, ProgressRing, STATE_TONE, StateLine } from '../../../ui'
import type { TileBar } from '../../../store/selectors/sustainability-screens'
import type { MetricState } from '../../../domain/engines/metricState'

/** An ordinal ramp for the stages, from settled to still open. */
const STAGE_COLOUR: Record<string, string> = {
  confirmed: 'var(--color-brand-700)',
  reserved: 'var(--color-brand-500)',
  requested: 'var(--color-brand-300)',
  to_request: 'var(--color-brand-100)',
}

/** Shown while the tile is too narrow for its ring: the same figure as a thin bar with the target tick. */
function NarrowBar({ bar, state, label }: { bar: TileBar; state: MetricState; label: string }) {
  return (
    <ProgressBar value={bar.value} max={bar.max} target={bar.target} targetText={bar.targetText} label={label} valueText={bar.valueText} tone={STATE_TONE[state]} size="sm" className="mt-2.5 @[19rem]:hidden" />
  )
}

/** Shown while the tile is too narrow for its donut: the cost by stage as one stacked bar. */
function StageBar({ stages }: { stages: { key: string; label: string; value: number; colour: string; valueText: string }[] }) {
  return (
    <div role="img" aria-label={`Indicative cost by stage: ${stages.map((s) => `${s.label} ${s.valueText}`).join(', ')}`} className="mt-2.5 flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full @[19rem]:hidden">
      {stages
        .filter((s) => s.value > 0)
        .map((s) => (
          <span key={s.key} className="h-full" style={{ flexGrow: s.value, flexBasis: 0, background: s.colour }} />
        ))}
    </div>
  )
}

export function ClientMetrics({ v }: { v: ClientHomeView }) {
  const m = v.metrics
  const t = v.tiles
  const stages = m.cost.byStage.map((s) => ({ key: s.key, label: s.label, value: s.total, colour: STAGE_COLOUR[s.key], valueText: f.moneyWhole(s.total) }))
  return (
    <MetricGrid label="Your projects in figures" testId="client-metrics" stackOnPhone>
      <MetricTile
        label="Indicative cost"
        icon={Wallet}
        value={f.moneyWhole(m.cost.total)}
        sub={
          m.cost.count === 0 ? (
            'Nothing approved yet'
          ) : (
            <>
              {`${m.cost.count} reclaimed ${m.cost.count === 1 ? 'material' : 'materials'} across ${m.cost.projects} ${m.cost.projects === 1 ? 'project' : 'projects'}`}
              <StageBar stages={stages} />
            </>
          )
        }
        chart={m.cost.total > 0 ? <Donut segments={stages} label="Indicative cost by stage" size={72} /> : undefined}
        footer={m.cost.total > 0 ? <Legend label="Stages" className="gap-x-3 gap-y-1 text-xs" items={stages.filter((s) => s.value > 0).map((s) => ({ key: s.key, label: s.label, colour: s.colour }))} /> : undefined}
        indicative
        testId="client-metric-cost"
      />
      <MetricTile
        label="Saving against new"
        icon={PiggyBank}
        value={t.saving.valueText}
        state={m.cost.count > 0 ? t.saving.state : undefined}
        stateLabel={t.saving.stateLabel}
        sub={
          m.cost.count === 0 ? (
            'Shown once materials are approved'
          ) : (
            <>
              {m.saving.text}
              {t.saving.ring ? (
                <ProgressBar value={t.saving.ring.value} max={t.saving.ring.max} label="Saving against the cost new" valueText={m.saving.text} tone={STATE_TONE[t.saving.state]} size="sm" className="mt-2.5 @[19rem]:hidden" />
              ) : null}
            </>
          )
        }
        chart={t.saving.ring ? <ProgressRing value={t.saving.ring.value} max={t.saving.ring.max} label="Saving against the cost new" valueText={m.saving.text} state={t.saving.state} size={72} centre={t.saving.ring.centre} /> : undefined}
        indicative
        testId="client-metric-saving"
      />
      <MetricTile
        label="Avoided carbon, secured"
        icon={Leaf}
        value={f.number(m.carbon.securedT, 1)}
        unit="tCO2e"
        state={m.carbon.targetT > 0 ? t.carbon.state : undefined}
        stateLabel={t.carbon.stateLabel}
        sub={
          <>
            {m.carbon.targetT > 0 ? <span className="block">Of {f.number(m.carbon.targetT, 0)} tCO2e targeted</span> : <span className="block">No carbon target set</span>}
            <span className="block">{f.number(m.carbon.approvedT, 1)} tCO2e more with approved materials</span>
            {t.carbon.bar ? <NarrowBar bar={t.carbon.bar} state={t.carbon.state} label="Avoided carbon against the targets" /> : null}
          </>
        }
        chart={t.carbon.ring ? <ProgressRing value={t.carbon.ring.value} max={t.carbon.ring.max} label="Avoided carbon against the targets" valueText={t.carbon.ring.valueText} state={t.carbon.state} size={72} centre={t.carbon.ring.centre} /> : undefined}
        indicative
        testId="client-metric-carbon"
      />
      <MetricTile
        label="Reuse by value"
        icon={Recycle}
        value={m.reuse.reuse === null ? 'No bill yet' : f.percent(m.reuse.reuse)}
        sub={
          m.reuse.content === null ? (
            'Needs the bill of materials'
          ) : (
            <>
              <span className="block">Reused items, as a share of the bill</span>
              {/* Content by value has its own line, meter and state, so the state word never sits on the reuse figure. */}
              <span className="mt-3 flex items-center gap-3 border-t border-line-soft pt-3" data-testid="client-reuse-content">
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="block text-ink-soft">{t.reuse.contentText}</span>
                  {t.reuse.bar ? <ProgressBar value={t.reuse.bar.value} max={t.reuse.bar.max} target={t.reuse.bar.target} targetText={t.reuse.bar.targetText} label="Reused and recycled content against the aim" valueText={t.reuse.bar.valueText} tone={STATE_TONE[t.reuse.state]} size="sm" className="@[19rem]:hidden" /> : null}
                  <StateLine state={t.reuse.state} label={t.reuse.stateLabel} />
                </span>
                {t.reuse.ring ? (
                  <span className="hidden shrink-0 @[19rem]:block">
                    <ProgressRing value={t.reuse.ring.value} max={t.reuse.ring.max} label="Reused and recycled content against the aim" valueText={t.reuse.ring.valueText} state={t.reuse.state} size={56} centre={t.reuse.ring.centre} />
                  </span>
                ) : null}
              </span>
            </>
          )
        }
        indicative
        testId="client-metric-reuse"
      />
    </MetricGrid>
  )
}
