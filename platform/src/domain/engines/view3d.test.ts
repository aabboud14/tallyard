import { describe, it, expect } from 'vitest'
import type { PublicListing } from '../types'
import { DEFAULT_ASSUMPTIONS as A } from '../reference/assumptions'
import { createSeed } from '../seed/world'
import { listingFor } from '../visibility'
import { meshFor } from './geometry'
import { DEFAULT_ANGLES, dragToAngles, KEY_STEP_DEG, projectMesh, shadeHex, stepAngles, type Frame, type Mesh } from './view3d'

/** A 2 by 2 by 2 cube centred on the origin, faces wound anticlockwise from outside. */
const CUBE: Mesh = {
  vertices: [
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ],
  faces: [
    [4, 5, 6, 7], // +z
    [1, 0, 3, 2], // -z
    [5, 1, 2, 6], // +x
    [0, 4, 7, 3], // -x
    [7, 6, 2, 3], // +y
    [0, 1, 5, 4], // -y
  ],
}
const FRAME: Frame = { width: 200, height: 200, margin: 10 }

describe('projectMesh', () => {
  it('shows only the +z face square on, centred, with half-side 90 over root 3', () => {
    const p = projectMesh(CUBE, { yawDeg: 0, pitchDeg: 0 }, FRAME)
    expect(p.faces).toHaveLength(1)
    expect(p.faces[0].index).toBe(0)
    const xs = p.faces[0].points.map((q) => q[0])
    const ys = p.faces[0].points.map((q) => q[1])
    const half = 90 / Math.sqrt(3)
    expect((Math.max(...xs) + Math.min(...xs)) / 2).toBeCloseTo(100, 6)
    expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(100, 6)
    expect((Math.max(...xs) - Math.min(...xs)) / 2).toBeCloseTo(half, 1)
    expect((Math.max(...ys) - Math.min(...ys)) / 2).toBeCloseTo(half, 1)
    expect(half).toBeCloseTo(51.96, 2)
  })

  it('shows the -z face from behind', () => {
    const p = projectMesh(CUBE, { yawDeg: 180, pitchDeg: 0 }, FRAME)
    expect(p.faces.map((f) => f.index)).toEqual([1])
  })

  it('shows three faces from a corner, far first', () => {
    const p = projectMesh(CUBE, { yawDeg: 45, pitchDeg: 30 }, FRAME)
    expect(p.faces).toHaveLength(3)
    const depths = p.faces.map((f) => f.depth)
    expect([...depths].sort((a, b) => a - b)).toEqual(depths)
    // A positive pitch shows the top.
    expect(p.faces.map((f) => f.index)).toContain(4)
  })

  it('keeps every point in the frame and every light in range at any angle', () => {
    for (let yaw = -180; yaw <= 180; yaw += 15) {
      for (let pitch = -85; pitch <= 85; pitch += 17) {
        const p = projectMesh(CUBE, { yawDeg: yaw, pitchDeg: pitch }, FRAME)
        expect(p.faces.length).toBeGreaterThan(0)
        for (const f of p.faces) {
          expect(f.light).toBeGreaterThanOrEqual(0.35)
          expect(f.light).toBeLessThanOrEqual(1)
          for (const [x, y] of f.points) {
            expect(x).toBeGreaterThanOrEqual(10)
            expect(x).toBeLessThanOrEqual(190)
            expect(y).toBeGreaterThanOrEqual(10)
            expect(y).toBeLessThanOrEqual(190)
          }
        }
      }
    }
  })

  it('places the shadow under the model', () => {
    const p = projectMesh(CUBE, DEFAULT_ANGLES, FRAME)
    expect(p.shadow).toEqual({ cx: 100, cy: 182.8, rx: 72, ry: 10.8 })
  })

  it('draws the close-up of UB 457x191x67 with a few faces, the same every time', () => {
    const w = createSeed()
    const l: PublicListing = Object.values(w.lots)
      .map((lot) => listingFor(w, lot.id, A))
      .find((x) => x.publicId === 'L-9F4CQQ')!
    const m = meshFor(l)
    if ('unavailable' in m) throw new Error(m.unavailable)
    const frame = { width: 640, height: 480, margin: 24 }
    const a = projectMesh(m.closeUp!, DEFAULT_ANGLES, frame)
    expect(a.faces.length).toBeGreaterThanOrEqual(3)
    expect(a.faces.length).toBeLessThanOrEqual(12)
    expect(projectMesh(m.closeUp!, DEFAULT_ANGLES, frame)).toEqual(a)
  })
})

describe('angles', () => {
  it('turns with a drag, clamps the pitch and wraps the yaw', () => {
    expect(DEFAULT_ANGLES).toEqual({ yawDeg: -35, pitchDeg: 20 })
    expect(dragToAngles({ yawDeg: -35, pitchDeg: 20 }, 100, 0)).toEqual({ yawDeg: 5, pitchDeg: 20 })
    expect(dragToAngles({ yawDeg: -35, pitchDeg: 20 }, 0, 1000).pitchDeg).toBe(85)
    expect(dragToAngles({ yawDeg: -35, pitchDeg: 20 }, 0, -1000).pitchDeg).toBe(-85)
    expect(dragToAngles({ yawDeg: 170, pitchDeg: 0 }, 40, 0, 1).yawDeg).toBe(-150)
    expect(dragToAngles({ yawDeg: 170, pitchDeg: 0 }, 10, 0, 1).yawDeg).toBe(180)
  })

  it('steps 15 degrees with the arrow keys', () => {
    expect(KEY_STEP_DEG).toBe(15)
    expect(stepAngles(DEFAULT_ANGLES, 'right')).toEqual({ yawDeg: -20, pitchDeg: 20 })
    expect(stepAngles(DEFAULT_ANGLES, 'left')).toEqual({ yawDeg: -50, pitchDeg: 20 })
    expect(stepAngles(DEFAULT_ANGLES, 'up')).toEqual({ yawDeg: -35, pitchDeg: 35 })
    expect(stepAngles(DEFAULT_ANGLES, 'down')).toEqual({ yawDeg: -35, pitchDeg: 5 })
    expect(stepAngles({ yawDeg: 180, pitchDeg: 80 }, 'right')).toEqual({ yawDeg: -165, pitchDeg: 80 })
    expect(stepAngles({ yawDeg: 0, pitchDeg: 80 }, 'up').pitchDeg).toBe(85)
  })
})

describe('shadeHex', () => {
  it('scales each channel by the light', () => {
    expect(shadeHex('#808080', 0.5)).toBe('#404040')
    expect(shadeHex('#6b7a86', 1)).toBe('#6b7a86')
    expect(shadeHex('#FFFFFF', 2)).toBe('#ffffff')
    expect(shadeHex('#6b7a86', 0)).toBe('#000000')
  })
})
