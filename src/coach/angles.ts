// Joint angles from MediaPipe body points, measured on the side of the body facing the camera.
import type { Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { MIN_VISIBILITY } from '../pose/drawSkeleton'
import type { BodyPart, Metric } from '../exercises/types'

export type Side = 'left' | 'right'

// MediaPipe's numbering for the body points we use.
const POINTS = {
  left: { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27, heel: 29, toe: 31 },
  right: { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28, heel: 30, toe: 32 },
} as const

/** Every tracked metric in degrees, or null when the joints involved aren't visible. */
export type Angles = Record<Metric, number | null>

export const NO_ANGLES: Angles = {
  knee: null, hip: null, elbow: null, torsoLean: null, bodyLine: null, stanceSplit: null, balance: null,
  upperArm: null, kneeLift: null, leanVsShin: null, heelLift: null, hipOffset: null, thighTilt: null,
  hipsRiseFirst: null, leanAtBottom: null, footTilt: null, descentMs: null, collapsedMs: null,
}

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

/**
 * How wide the shoulders look on camera compared with torso height (2D image, aspect-corrected).
 * Facing the camera: shoulders look wide (≈ 0.6–0.8). Side-on: they overlap (≈ 0–0.25).
 */
export function shoulderSpread(screen: NormalizedLandmark[], aspect: number): number | null {
  const [ls, rs, lh, rh] = [screen[11], screen[12], screen[23], screen[24]]
  if (!ls || !rs || !lh || !rh) return null
  const midS = { x: ((ls.x + rs.x) / 2) * aspect, y: (ls.y + rs.y) / 2 }
  const midH = { x: ((lh.x + rh.x) / 2) * aspect, y: (lh.y + rh.y) / 2 }
  const torso = Math.hypot(midS.x - midH.x, midS.y - midH.y)
  if (torso === 0) return null
  return (Math.abs(ls.x - rs.x) * aspect) / torso
}

// Two thresholds so the label doesn't flicker when you're half-turned.
const FACING_ABOVE = 0.5
const SIDE_ON_BELOW = 0.35

/** True when the person faces the camera (not side-on). Keeps the previous answer in the grey zone. */
export function isFacingCamera(spread: number | null, wasFacing: boolean): boolean {
  if (spread === null) return wasFacing
  if (spread > FACING_ABOVE) return true
  if (spread < SIDE_ON_BELOW) return false
  return wasFacing
}

/**
 * Upper-arm angle vs horizontal, in degrees: 90 = arm vertical, 0 = shoulder level with the elbow
 * (upper arm parallel to the floor — the push-up depth standard), negative = shoulder below elbow.
 */
function upperArmTilt(shoulder: Landmark, elbow: Landmark): number {
  const down = elbow.y - shoulder.y // world y points down: positive = shoulder above elbow
  const across = Math.hypot(elbow.x - shoulder.x, elbow.z - shoulder.z)
  return (Math.atan2(down, across) * 180) / Math.PI
}

/** Heel→toe line vs horizontal, in degrees. 0 = foot flat; positive = heel raised above the toes. */
function heelLift(heel: Landmark, toe: Landmark): number {
  const up = toe.y - heel.y // world y points down: positive = heel higher than toe
  const along = Math.hypot(toe.x - heel.x, toe.z - heel.z)
  return (Math.atan2(up, along) * 180) / Math.PI
}

/**
 * How far the hip sits above (+) or below (−) the straight line from shoulder to ankle, as a
 * fraction of shoulder–ankle length. In a straight plank it's ~0; sagging hips go negative,
 * piked hips go positive.
 */
function hipOffset(shoulder: Landmark, hip: Landmark, ankle: Landmark): number | null {
  const dx = ankle.x - shoulder.x
  const length = Math.hypot(dx, ankle.y - shoulder.y)
  if (Math.abs(dx) < 1e-6 || length === 0) return null
  const lineY = shoulder.y + ((ankle.y - shoulder.y) * (hip.x - shoulder.x)) / dx
  return (lineY - hip.y) / length // world y points down: positive = hip above the line
}

/** Knee height above the wrist (hands on the floor = floor level), as a fraction of thigh length. */
function kneeLift(hip: Landmark, knee: Landmark, wrist: Landmark): number | null {
  const thigh = Math.hypot(hip.x - knee.x, hip.y - knee.y, hip.z - knee.z)
  if (thigh === 0) return null
  return (wrist.y - knee.y) / thigh // world y points down: positive = knee above the wrist
}

/**
 * Are all these body parts (on the side facing the camera) inside the picture and clearly seen?
 * A small margin keeps points right at the edge from counting as "in view".
 */
export function partsInView(screen: NormalizedLandmark[], side: Side, parts: BodyPart[]): boolean {
  return partsOutOfView(screen, side, parts).length === 0
}

/** The needed body parts that aren't clearly inside the picture (so the prompt can name them). */
export function partsOutOfView(screen: NormalizedLandmark[], side: Side, parts: BodyPart[]): BodyPart[] {
  const M = 0.01
  return parts.filter((part) => {
    const p = screen[POINTS[side][part]]
    return !(p && (p.visibility ?? 0) >= MIN_VISIBILITY && p.x > M && p.x < 1 - M && p.y > M && p.y < 1 - M)
  })
}

/**
 * How much room is left around the needed body parts: the smallest gap between any of them and the
 * picture's edge, as a share of the picture (0.1 = 10%). null if one isn't visible. Used to find the
 * closest workable distance (debug view, step 22).
 */
export function edgeRoom(screen: NormalizedLandmark[], side: Side, parts: BodyPart[]): number | null {
  let room = Infinity
  for (const part of parts) {
    const p = screen[POINTS[side][part]]
    if (!p || (p.visibility ?? 0) < MIN_VISIBILITY) return null
    room = Math.min(room, p.x, 1 - p.x, p.y, 1 - p.y)
  }
  return room === Infinity ? null : room
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
    upperArm: seen(p.shoulder, p.elbow) ? upperArmTilt(world[p.shoulder], world[p.elbow]) : null,
    kneeLift: seen(p.hip, p.knee, p.wrist) ? kneeLift(world[p.hip], world[p.knee], world[p.wrist]) : null,
    leanVsShin: seen(p.shoulder, p.hip, p.knee, p.ankle)
      ? tiltFromVertical(world[p.shoulder], world[p.hip]) - tiltFromVertical(world[p.knee], world[p.ankle])
      : null,
    heelLift: seen(p.heel, p.toe) ? heelLift(world[p.heel], world[p.toe]) : null,
    hipOffset: seen(p.shoulder, p.hip, p.ankle) ? hipOffset(world[p.shoulder], world[p.hip], world[p.ankle]) : null,
    thighTilt: seen(p.hip, p.knee) ? upperArmTilt(world[p.hip], world[p.knee]) : null, // same maths: line vs horizontal
    footTilt: seen(p.heel, p.toe) ? Math.abs(heelLift(world[p.heel], world[p.toe])) : null,
    hipsRiseFirst: null, // worked out per rep by the rep counter
    leanAtBottom: null, // worked out per rep by the rep counter
    descentMs: null, // worked out per rep by the rep counter
    collapsedMs: null, // worked out per rep by the rep counter
  }
}
