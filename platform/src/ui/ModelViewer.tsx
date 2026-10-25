// The spinnable 3D view of a material, drawn as flat-shaded SVG polygons from the recorded dimensions
// (feedback/r2-design/marketplace-material.md section 7.4) in the house drawing style: paper-toned flat fills, ink
// hairlines and no shadow (visual-qa.md rule 2). The projection, culling, sort and shading come from
// the pure engine in domain/engines/view3d.ts; this component only draws what it returns. Drag to turn it, or
// use the arrow keys; Home resets. A vertical swipe still scrolls the page on phones.
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import type { FamilyId } from '../domain/types'
import { DEFAULT_ANGLES, dragToAngles, faceFill, projectMesh, stepAngles, type Mesh, type ViewAngles } from '../domain/engines/view3d'
import { cx } from './cx'

/** A base tone per family; faces are this tone lifted towards paper (faceFill), outlined in ink hairlines. */
const FAMILY_TONE: Record<FamilyId, string> = {
  steel_section: '#6b7a86',
  curtain_wall: '#9fb7c4',
  precast_cladding: '#b9b6ae',
  stone_cladding: '#d9cfbb',
  clay_brick: '#a6553b',
  raised_floor: '#8d9399',
  timber_joist: '#a57f55',
}

const FRAMES = {
  stage: { width: 640, height: 480, margin: 48 },
  thumb: { width: 120, height: 90, margin: 8 },
} as const

const KEYS: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }

export type ModelViewerProps = {
  mesh: Mesh
  family: FamilyId
  /** The material's title, for the accessible name "3D view of {title}". */
  title: string
  size?: 'stage' | 'thumb'
  /** Controlled angles. Leave out to let the viewer keep its own. */
  angles?: ViewAngles
  onAnglesChange?: (a: ViewAngles) => void
  /** Id of the caption that describes the view, for aria-describedby. */
  describedBy?: string
  /** Show the Reset view button (stage size only). */
  showReset?: boolean
  /** More controls beside Reset view, for example the close-up toggle. */
  actions?: ReactNode
  className?: string
  testId?: string
}

export function ModelViewer({ mesh, family, title, size = 'stage', angles: controlled, onAnglesChange, describedBy, showReset = true, actions, className, testId = 'model-viewer' }: ModelViewerProps) {
  const [own, setOwn] = useState<ViewAngles>(DEFAULT_ANGLES)
  const angles = controlled ?? own
  const set = useCallback(
    (a: ViewAngles) => {
      if (!controlled) setOwn(a)
      onAnglesChange?.(a)
    },
    [controlled, onAnglesChange],
  )
  const frame = FRAMES[size]
  const projection = projectMesh(mesh, angles, frame)
  const tone = FAMILY_TONE[family]
  const interactive = size === 'stage'

  // Pointer drag, throttled to one update per animation frame.
  const drag = useRef<{ x: number; y: number; start: ViewAngles; dx: number; dy: number } | null>(null)
  const frameReq = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (frameReq.current !== null) cancelAnimationFrame(frameReq.current)
    },
    [],
  )
  const flush = () => {
    frameReq.current = null
    const d = drag.current
    if (d) set(dragToAngles(d.start, d.dx, d.dy))
  }
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button !== 0) return
    if ((e.target as Element).closest('button')) return
    drag.current = { x: e.clientX, y: e.clientY, start: angles, dx: 0, dy: 0 }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    d.dx = e.clientX - d.x
    d.dy = e.clientY - d.y
    if (frameReq.current === null) frameReq.current = requestAnimationFrame(flush)
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    if (frameReq.current !== null) {
      cancelAnimationFrame(frameReq.current)
      flush()
    }
    drag.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }
  // The browser took the gesture over (a vertical swipe that scrolls the page on a phone): the model goes back to
  // where it was, so scrolling past the viewer never tilts it.
  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    if (frameReq.current !== null) {
      cancelAnimationFrame(frameReq.current)
      frameReq.current = null
    }
    drag.current = null
    set(d.start)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || e.target !== e.currentTarget) return
    const k = KEYS[e.key]
    if (k) {
      e.preventDefault()
      set(stepAngles(angles, k))
    } else if (e.key === 'Home') {
      e.preventDefault()
      set(DEFAULT_ANGLES)
    }
  }

  const svg = (
    <svg role="img" aria-label={`3D view of ${title}`} viewBox={`0 0 ${frame.width} ${frame.height}`} className="block h-auto w-full select-none" preserveAspectRatio="xMidYMid meet">
      {/* No shadow under the model: drawings carry no drop shadows (visual-qa.md, rule 2). */}
      {projection.faces.map((f) => (
        <polygon key={f.index} data-part="face" points={f.points.map(([x, y]) => `${x},${y}`).join(' ')} fill={faceFill(tone, f.light)} stroke="var(--color-ink)" strokeWidth={size === 'stage' ? 0.75 : 0.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )

  if (!interactive) {
    return (
      <div data-testid={testId} data-yaw={angles.yawDeg} data-pitch={angles.pitchDeg} className={cx('min-w-0', className)}>
        {svg}
      </div>
    )
  }

  return (
    <div className={cx('relative min-w-0', className)}>
      <div
        data-testid={testId}
        data-yaw={angles.yawDeg}
        data-pitch={angles.pitchDeg}
        tabIndex={0}
        aria-roledescription="3D viewer"
        aria-describedby={describedBy}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="cursor-grab rounded-md outline-none [touch-action:pan-y] focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:cursor-grabbing"
      >
        {svg}
      </div>
      {showReset || actions ? (
        <div className="absolute right-2 top-2 flex items-center gap-1.5">
          {actions}
          {showReset ? (
            <button
              type="button"
              onClick={() => set(DEFAULT_ANGLES)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-sm font-medium text-ink-soft shadow-xs hover:border-line-strong hover:text-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 max-sm:h-11 [&_svg]:size-3.5"
            >
              <RotateCcw aria-hidden="true" />
              Reset view
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
