// Joint angles from MediaPipe body points, measured on the side of the body facing the camera.
import type { Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { MIN_VISIBILITY } from '../pose/drawSkeleton'
import type { Metric } from '../exercises/types'

export type Side = 'left' | 'right'

// MediaPipe's numbering for the body points we use.
const POINTS = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
} as const

/** Every tracked metric in degrees, or null when the joints involved aren't visible. */
export type Angles = Record<Metric, number | null>

export const NO_ANGLES: Angles = { knee: null, hip: null, elbow: null, torsoLean: null, bodyLine: null, stanceSplit: null, balance: null }

/** Angle in degrees at point b, formed by a–b–c (e.g. hip–knee–ankle = knee angle). Uses 3D. */
export function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const ab = [a.x - b.x, a.y - b.y, a.z - b.z]
  const cb = [c.x - b.x, c.y - b.y, c.z - b.z]
  const dot = ab[0] * cb[0] + ab[1] * cb[1] + ab[2] * cb[2]
  const len = Math.hypot(...ab) * Math.hypot(...cb)
  if (len === 0) return 0
  return (Math.acos(Math.min(1, Math.max(-1, dot / len))) * 180) / Math.PI
}

/** How far the a→b line tilts from vertical, in degrees (0 = upright, 90 = horizontal). */
export function tiltFromVertical(a: Landmark, b: Landmark): number {
  const d = [a.x - b.x, a.y - b.y, a.z - b.z]
  const len = Math.hypot(...d)
  if (len === 0) return 0
  return (Math.acos(Math.min(1, Math.abs(d[1]) / len)) * 180) / Math.PI
}

/**
 * Front-to-back gap between the two ankles, as a fraction of leg length (hip→knee→ankle).
 * Seen from the side, a squat has the feet roughly side by side (small number); a lunge or
 * split stance has one foot well in front of the other (big number). Uses the horizontal
 * image direction only, so normal stance *width* (towards the camera) doesn't count.
 */
function stanceSplit(screen: NormalizedLandmark[], world: Landmark[], side: Side): number | null {
  const near = POINTS[side]
  const far = POINTS[side === 'left' ? 'right' : 'left']
  // The far ankle is often behind the near leg; MediaPipe still estimates it, usually well
  // enough for "is it far in front/behind?". Require only a low bar of confidence for it.
  const ok = [near.hip, near.knee, near.ankle].every((i) => (screen[i]?.visibility ?? 0) >= MIN_VISIBILITY)
  if (!ok || (screen[far.ankle]?.visibility ?? 0) < 0.2) return null
  const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
  const leg = dist(world[near.hip], world[near.knee]) + dist(world[near.knee], world[near.ankle])
  if (leg === 0) return null
  return Math.abs(world[near.ankle].x - world[far.ankle].x) / leg
}

/**
 * Front-to-back distance between the shoulder and the ankle facing the camera, ÷ leg length.
 * Only uses points the camera can see. To stay balanced in a squat your shoulders sit roughly
 * over your feet; in a lunge your weight is between two far-apart feet, so the shoulder ends up
 * well in front of or behind the visible ankle.
 */
function balance(screen: NormalizedLandmark[], world: Landmark[], side: Side): number | null {
  const p = POINTS[side]
  const ok = [p.shoulder, p.hip, p.knee, p.ankle].every((i) => (screen[i]?.visibility ?? 0) >= MIN_VISIBILITY)
  if (!ok) return null
  const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
  const leg = dist(world[p.hip], world[p.knee]) + dist(world[p.knee], world[p.ankle])
  if (leg === 0) return null
  return Math.abs(world[p.shoulder].x - world[p.ankle].x) / leg
}

/** Diagnostics for tuning the lunge check (shown in the ?debug view only). */
export type StanceDiag = {
  nearAnkleVis: number
  farAnkleVis: number
  worldSplit: number | null
  screenSplit: number | null
}

export function stanceDiagnostics(screen: NormalizedLandmark[], world: Landmark[], side: Side, aspect: number): StanceDiag {
  const near = POINTS[side]
  const far = POINTS[side === 'left' ? 'right' : 'left']
  // Same idea as stanceSplit, but measured on the 2D image (x scaled by aspect ratio so units match y).
  const px = (p: NormalizedLandmark) => ({ x: p.x * aspect, y: p.y })
  const d2 = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(px(a).x - px(b).x, px(a).y - px(b).y)
  const leg = d2(screen[near.hip], screen[near.knee]) + d2(screen[near.knee], screen[near.ankle])
  return {
    nearAnkleVis: screen[near.ankle]?.visibility ?? 0,
    farAnkleVis: screen[far.ankle]?.visibility ?? 0,
    worldSplit: stanceSplit(screen, world, side),
    screenSplit: leg > 0 ? Math.abs(screen[near.ankle].x - screen[far.ankle].x) * aspect / leg : null,
  }
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
 * All metrics (knee, hip, elbow, torso lean, body line) on one side.
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
    torsoLean: seen(p.shoulder, p.hip) ? tiltFromVertical(world[p.shoulder], world[p.hip]) : null,
    bodyLine: at(p.shoulder, p.hip, p.ankle),
    stanceSplit: stanceSplit(screen, world, side),
    balance: balance(screen, world, side),
  }
}
