// The spinnable 3D view (feedback/r2-design/marketplace-material.md section 3.4): a pure orthographic projection
// with back-face culling, a painter's sort and flat shading. The component only draws the polygons it returns.
// Y is up and the viewer looks from +z.

export type Vec3 = [number, number, number]
/** Faces are 0-based vertex indices, wound anticlockwise seen from outside (outward normals). Y is up. */
export type Mesh = { vertices: Vec3[]; faces: number[][] }
export type ViewAngles = { yawDeg: number; pitchDeg: number }
export type Frame = { width: number; height: number; margin: number }
export type ProjectedFace = { index: number; points: [number, number][]; depth: number; light: number }
export type MeshProjection = { faces: ProjectedFace[]; shadow: { cx: number; cy: number; rx: number; ry: number } }

export const DEFAULT_ANGLES: ViewAngles = { yawDeg: -35, pitchDeg: 20 }
export const KEY_STEP_DEG = 15
export const PITCH_LIMIT_DEG = 85

const LIGHT: Vec3 = normalise([-0.4, 0.7, 0.6])

function normalise(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2])
  return len === 0 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

function round(x: number, places: number): number {
  const k = 10 ** places
  const r = Math.round(x * k) / k
  return r === 0 ? 0 : r
}

function boundsCentre(vertices: Vec3[]): Vec3 {
  const c: Vec3 = [0, 0, 0]
  for (let k = 0; k < 3; k++) {
    let lo = Infinity
    let hi = -Infinity
    for (const v of vertices) {
      lo = Math.min(lo, v[k])
      hi = Math.max(hi, v[k])
    }
    c[k] = vertices.length === 0 ? 0 : (lo + hi) / 2
  }
  return c
}

/** Newell's method: the (unnormalised) normal of a polygon, outward for anticlockwise winding. */
function newell(points: Vec3[]): Vec3 {
  const n: Vec3 = [0, 0, 0]
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    n[0] += (a[1] - b[1]) * (a[2] + b[2])
    n[1] += (a[2] - b[2]) * (a[0] + b[0])
    n[2] += (a[0] - b[0]) * (a[1] + b[1])
  }
  return n
}

export function projectMesh(mesh: Mesh, angles: ViewAngles, frame: Frame): MeshProjection {
  const c = boundsCentre(mesh.vertices)
  const r = mesh.vertices.reduce((m, v) => Math.max(m, Math.hypot(v[0] - c[0], v[1] - c[1], v[2] - c[2])), 0)
  const s = r === 0 ? 0 : (Math.min(frame.width, frame.height) / 2 - frame.margin) / r
  const yaw = (angles.yawDeg * Math.PI) / 180
  const pitch = (angles.pitchDeg * Math.PI) / 180
  const cy = Math.cos(yaw)
  const sy = Math.sin(yaw)
  const cp = Math.cos(pitch)
  const sp = Math.sin(pitch)
  const rotated: Vec3[] = mesh.vertices.map((v) => {
    const x = v[0] - c[0]
    const y = v[1] - c[1]
    const z = v[2] - c[2]
    // Ry(yaw), then Rx(pitch).
    const x1 = x * cy + z * sy
    const z1 = -x * sy + z * cy
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp]
  })
  const faces: ProjectedFace[] = []
  mesh.faces.forEach((face, index) => {
    const q = face.map((i) => rotated[i])
    const n = newell(q)
    if (!(n[2] > 1e-9)) return
    const u = normalise(n)
    const dot = u[0] * LIGHT[0] + u[1] * LIGHT[1] + u[2] * LIGHT[2]
    faces.push({
      index,
      points: q.map((p) => [round(frame.width / 2 + s * p[0], 2), round(frame.height / 2 - s * p[1], 2)]),
      depth: q.reduce((sum, p) => sum + p[2], 0) / q.length,
      light: round(0.35 + 0.65 * Math.max(0, dot), 3),
    })
  })
  faces.sort((a, b) => a.depth - b.depth || a.index - b.index)
  return {
    faces,
    shadow: {
      cx: round(frame.width / 2, 2),
      cy: round(frame.height / 2 + 0.92 * s * r, 2),
      rx: round(0.8 * s * r, 2),
      ry: round(0.12 * s * r, 2),
    },
  }
}

/** Into (-180, 180]. */
function wrapDeg(x: number): number {
  const w = ((((x + 180) % 360) + 360) % 360) - 180
  return round(w === -180 ? 180 : w, 3)
}

function clampPitch(x: number): number {
  return round(Math.min(PITCH_LIMIT_DEG, Math.max(-PITCH_LIMIT_DEG, x)), 3)
}

export function dragToAngles(a: ViewAngles, dxPx: number, dyPx: number, degPerPx = 0.4): ViewAngles {
  return { yawDeg: wrapDeg(a.yawDeg + dxPx * degPerPx), pitchDeg: clampPitch(a.pitchDeg + dyPx * degPerPx) }
}

export function stepAngles(a: ViewAngles, key: 'left' | 'right' | 'up' | 'down'): ViewAngles {
  switch (key) {
    case 'left':
      return { yawDeg: wrapDeg(a.yawDeg - KEY_STEP_DEG), pitchDeg: clampPitch(a.pitchDeg) }
    case 'right':
      return { yawDeg: wrapDeg(a.yawDeg + KEY_STEP_DEG), pitchDeg: clampPitch(a.pitchDeg) }
    case 'up':
      return { yawDeg: wrapDeg(a.yawDeg), pitchDeg: clampPitch(a.pitchDeg + KEY_STEP_DEG) }
    case 'down':
      return { yawDeg: wrapDeg(a.yawDeg), pitchDeg: clampPitch(a.pitchDeg - KEY_STEP_DEG) }
  }
}

/** A colour scaled by a light level: each channel times the light, rounded and clamped, as lower-case #rrggbb. */
export function shadeHex(baseHex: string, light: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(baseHex)
  if (!m) throw new Error('Bad colour: ' + baseHex)
  const out = [0, 2, 4].map((k) => {
    const v = Math.min(255, Math.max(0, Math.round(parseInt(m[1].slice(k, k + 2), 16) * light)))
    return v.toString(16).padStart(2, '0')
  })
  return '#' + out.join('')
}
