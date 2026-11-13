// Scripted, synthetic sets for the Test lab: each rep becomes a stream of body-angle frames that
// goes through the REAL rep counter and coaching code, so you can hear and see a set without
// exercising. Angles mimic what the pose tracker reports for each movement.
import { NO_ANGLES, type Angles } from '../coach/angles'

export const FRAME_MS = 33 // ~30 fps, like a camera

export type SimFrame = { angles: Angles; note?: string }

type SquatRep = {
  note: string
  knee?: number // deepest knee angle (counted below 100°)
  thigh?: number // thigh vs horizontal at the bottom (0 = parallel)
  lean?: number // torso lean beyond the shins at the bottom
  foot?: number // heel/toe tilt at the bottom
  split?: number // feet front-to-back (lunge ≈ 0.9)
  balance?: number // shoulder vs visible foot (lunge ≈ 0.5)
  hipsFirst?: number // extra forward tip on the way up
  downS?: number
  upS?: number
  /** Stand still for this long after the rep (to test the auto-finish). */
  idleS?: number
}

type PushupRep = {
  note: string
  arm?: number // deepest upper-arm angle (0 = parallel)
  sag?: number // hips below the line (negative)
  kneeLift?: number // knee height above hands (knee push-up ≈ 0.09)
  torso?: number // torso tilt from vertical (standing ≈ 8)
  holdS?: number // time resting at the bottom
  downS?: number
  upS?: number
}

export type Scenario = { id: string; exercise: 'squat' | 'pushup'; name: string; reps: (SquatRep | PushupRep)[] }

const jitter = (amount: number) => (Math.random() - 0.5) * 2 * amount

function squatFrames(r: SquatRep): SimFrame[] {
  const { knee = 82, thigh = -3, lean = 6, foot = 1, split = 0.05, balance = 0.12, hipsFirst = 0, downS = 1.1, upS = 1.1, idleS = 0 } = r
  const at = (p: number, rising: boolean): Angles => ({
    ...NO_ANGLES,
    knee: 175 - (175 - knee) * p + jitter(1.5),
    hip: 170 - 100 * p,
    thighTilt: 85 - (85 - thigh) * p + jitter(1.5),
    torsoLean: 10 + 35 * p + (rising ? hipsFirst * 4 * p * (1 - p) : 0) + jitter(1),
    leanVsShin: lean * p + jitter(2),
    footTilt: Math.abs(foot * p + jitter(1.5)),
    stanceSplit: split + jitter(0.02),
    balance: (balance - 0.05) * p + 0.05 + jitter(0.02),
  })
  const frames: SimFrame[] = [{ angles: at(0, false), note: r.note }]
  const down = Math.round((downS * 1000) / FRAME_MS)
  const up = Math.round((upS * 1000) / FRAME_MS)
  for (let i = 1; i <= down; i++) frames.push({ angles: at(Math.sin((Math.PI / 2) * (i / down)), false) })
  for (let i = 1; i <= up; i++) frames.push({ angles: at(Math.cos((Math.PI / 2) * (i / up)), true) })
  for (let i = 0; i < 20; i++) frames.push({ angles: at(0, false) }) // stand tall between reps
  for (let i = 0; i < (idleS * 1000) / FRAME_MS; i++) frames.push({ angles: at(0, false) }) // standing still
  return frames
}

function pushupFrames(r: PushupRep): SimFrame[] {
  const { arm = -5, sag = 0, kneeLift = 0.45, torso = 76, holdS = 0, downS = 0.9, upS = 0.9 } = r
  const knee = kneeLift < 0.2 ? 100 : 172 // knees on the floor bend the legs
  const at = (p: number): Angles => ({
    ...NO_ANGLES,
    upperArm: 85 - (85 - arm) * p + jitter(1.5),
    elbow: 170 - 80 * p + jitter(1.5),
    knee,
    kneeLift: kneeLift - (kneeLift - Math.min(kneeLift, 0.12)) * p,
    torsoLean: torso + jitter(1),
    bodyLine: 174 + sag * 150 * p,
    hipOffset: sag * p + jitter(0.008),
  })
  const frames: SimFrame[] = [{ angles: at(0), note: r.note }]
  const down = Math.round((downS * 1000) / FRAME_MS)
  const up = Math.round((upS * 1000) / FRAME_MS)
  for (let i = 1; i <= down; i++) frames.push({ angles: at(i / down) })
  for (let i = 0; i < (holdS * 1000) / FRAME_MS; i++) frames.push({ angles: at(1) })
  for (let i = 1; i <= up; i++) frames.push({ angles: at(1 - i / up) })
  for (let i = 0; i < 12; i++) frames.push({ angles: at(0) }) // arms straight between reps
  return frames
}

/** All frames for a scenario: a short start position, then each scripted rep. */
export function buildFrames(s: Scenario): SimFrame[] {
  const make = (r: SquatRep | PushupRep) => (s.exercise === 'squat' ? squatFrames(r as SquatRep) : pushupFrames(r as PushupRep))
  const start = make({ note: 'Getting into position' }).slice(-20)
  return [...start, ...s.reps.flatMap(make)]
}

export const SCENARIOS: Scenario[] = [
  { id: 'squat-clean', exercise: 'squat', name: 'Squats: 6 clean reps', reps: Array.from({ length: 6 }, (_, i) => ({ note: `Rep ${i + 1}: clean` })) },
  {
    id: 'squat-mixed',
    exercise: 'squat',
    name: 'Squats: mixed form',
    reps: [
      { note: 'Clean rep' },
      { note: 'Leans far forward', lean: 38 },
      { note: 'Leans far forward again (pattern)', lean: 38 },
      { note: 'Clean rep (fix should be praised)' },
      { note: 'Half squat (won’t count)', knee: 125, thigh: 30 },
      { note: 'Lunge stance (won’t count)', split: 0.9, balance: 0.5 },
      { note: 'Hips rise first (safety)', hipsFirst: 40 },
      { note: 'Just above parallel', knee: 95, thigh: 18 },
      { note: 'Just above parallel again (pattern)', knee: 95, thigh: 18 },
      { note: 'Bouncing (won’t count)', downS: 0.3, upS: 0.3 },
    ],
  },
  {
    id: 'squat-stop',
    exercise: 'squat',
    name: 'Squats: stop early (auto-finish)',
    reps: [
      ...Array.from({ length: 3 }, (_, i) => ({ note: `Rep ${i + 1}: clean` })),
      { note: 'Rep 4, then stands still', idleS: 20 },
    ],
  },
  { id: 'pushup-clean', exercise: 'pushup', name: 'Push-ups: 6 clean reps', reps: Array.from({ length: 6 }, (_, i) => ({ note: `Rep ${i + 1}: clean` })) },
  {
    id: 'pushup-mixed',
    exercise: 'pushup',
    name: 'Push-ups: mixed form',
    reps: [
      { note: 'Clean rep' },
      { note: 'Hips sagging (safety)', sag: -0.09 },
      { note: 'Clean rep (fix should be praised)' },
      { note: 'Half push-up (won’t count)', arm: 35 },
      { note: 'Knee push-up (won’t count)', kneeLift: 0.09 },
      { note: 'Fast drop', downS: 0.25, upS: 1 },
      { note: 'Fast drop again (pattern)', downS: 0.25, upS: 1 },
      { note: 'Arms bent while standing (won’t count)', torso: 8 },
    ],
  },
]
