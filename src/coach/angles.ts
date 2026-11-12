// Joint angles from MediaPipe body points, measured on the side of the body facing the camera.
import type { Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { MIN_VISIBILITY } from '../pose/drawSkeleton'

export type Side = 'left' | 'right'

// MediaPipe's numbering for the body points we use.
const POINTS = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
} as const

export type Angles = { knee: number | null; hip: number | null; elbow: number | null }

/** Angle in degrees at point b, formed by a–b–c (e.g. hip–knee–ankle = knee angle). Uses 3D. */
export function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = [a.x - b.x, a.y - b.y, a.z - b.z]
  const cb = [c.x - b.x, c.y - b.y, c.z - b.z]
  const dot = ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2]
  const len = Math.hypot(...ab) * Math.hypot(...cb)
  if (len === 0) return 0
  return (Math.acos(Math.min(1, Math.max(-1, dot / len))) * 180) / Math.PI
}

const sideScore = (points: NormalizedLandmark[], side: Side) =>
  Object.values(POINTS[side]).reduce((sum, i) => sum + (points[i]?.visibility ?? 0), 0)

/**
 * Picks the side of the body the camera sees best. Sticks with the current side unless the
 * other one is clearly better, so the label doesn't flicker when you're square to the camera.
 */
export function pickSide(points: NormalizedLandmark[], current: Side | null): Side {
  const left = sideScore(points, 'left')
  const right = sideScore(points, 'right')
  const best: Side = left >= right ? 'left' : 'right'
  if (current && best !== current && Math.abs(left - right) < 0.6) return current
  return best
}

/**
 * Knee, hip and elbow angles on one side.
 * `screen` points tell us what's visible; `world` points (3D, in metres) give the angles,
 * which makes them less sensitive to how the phone is tilted. Hidden joints return null.
 */
export function measureAngles(screen: NormalizedLandmark[], world: Landmark[], side: Side): Angles {
  const p = POINTS[side]
  const seen = (...ids: number[]) => ids.every((i) => (screen[i]?.visibility ?? 0) >= MIN_VISIBILITY)
  const at = (a: number, b: number, c: number) => (seen(a, b, c) ? angleAt(world[a], world[b], world[c]) : null)
  return {
    knee: at(p.hip, p.knee, p.ankle),
    hip: at(p.shoulder, p.hip, p.knee),
    elbow: at(p.shoulder, p.elbow, p.wrist),
  }
}
