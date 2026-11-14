// What every exercise file ("rule pack") describes. Adding an exercise = one new file using this shape.

/** Body measurements Spotter tracks every frame. Angles are in degrees. */
export type Metric =
  | 'knee' // hip–knee–ankle. 180 = straight leg.
  | 'hip' // shoulder–hip–knee. 180 = standing tall.
  | 'elbow' // shoulder–elbow–wrist. 180 = straight arm.
  | 'torsoLean' // shoulder–hip line vs. vertical. 0 = upright, 90 = horizontal.
  | 'bodyLine' // shoulder–hip–ankle. 180 = straight plank line.
  | 'stanceSplit' // front-to-back distance between the two ankles ÷ leg length. ~0 = feet side by side, big = lunge.
  //               Needs the far ankle, which is often hidden and only guessed, so treat with care.
  | 'upperArm' // shoulder→elbow line vs horizontal. 90 = arm vertical (top of a push-up), 0 = upper arm
  //            parallel to the floor (shoulder level with elbow), negative = shoulder below elbow.
  //            Unlike the elbow angle, it doesn't change with where the hands are placed.
  | 'kneeLift' // how high the knee is above the hands (= floor level in a push-up) ÷ thigh length.
  //            Full push-up ≈ 0.3–0.5 at the top; knee push-up ≈ 0.1 (knee resting on the floor).
  //            Needs only the knee and wrist, not the ankle.
  | 'leanVsShin' // torso lean minus shin lean (both from vertical). ~0 = torso parallel to shins (good squat);
  //              big positive = chest dropping forward.
  | 'heelLift' // heel→toe line vs horizontal. ~0 = foot flat; positive = heel raised.
  | 'hipOffset' // hip above (+) or below (−) the straight shoulder–ankle line, ÷ body length.
  //             ~0 = straight plank; negative = hips sagging; positive = hips piking.
  | 'thighTilt' // hip→knee line vs horizontal. Positive = hip above knee; 0 = thigh parallel to the floor
  //             (the squat depth standard: hips at knee height).
  | 'kneeLiftTop' // per rep: typical knee height above the hands while at the top (arms straight); robust to
  //               one jumpy frame, and not lowered by the bottom of the rep, where even full push-ups bring the knees down
  | 'leanAtBottom' // per rep: typical torso-vs-shin lean in the bottom half of the squat (median, so one noisy frame can't trigger a cue)
  | 'hipsRiseFirst' // per rep, not per frame: how much the torso tips further forward on the way up,
  //                 compared with the bottom (degrees). ~0 = chest and hips rise together.
  | 'footTilt' // how far the foot tips either way (heel OR toes off the floor), degrees. ~0 = whole foot down.
  | 'descentMs' // per rep: time from leaving the top to the deepest point, in milliseconds.
  | 'collapsedMs' // per rep (push-ups): time with the shoulders well below the elbows (on the floor),
  //               in milliseconds. A controlled deep rep passes through quickly; resting stays there.
  | 'balance' // front-to-back distance between shoulder and the visible ankle ÷ leg length. Uses only
  //           visible points. Squat ≈ shoulders over feet (small); lunge = shoulders between two far-apart feet (big).

/** Body points (on the side facing the camera) an exercise needs to see to judge a rep. */
export type BodyPart = 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle'

export type CameraHint = {
  /** Where the phone or laptop sits. */
  height: 'hip' | 'floor'
  /** How far away, shown to the user, per device (cameras differ: laptop webcams are narrower). */
  distance: { laptop: string; phone: string }
}

/**
 * How to count a rep: watch one metric. A rep starts when it drops below `downBelow`
 * and is counted when it comes back above `upAbove`. The gap between the two numbers
 * stops a wobble at the bottom from counting twice.
 */
export type RepRule = {
  metric: Metric
  downBelow: number
  upAbove: number
  /** Ignore "reps" faster than this (usually tracking glitches). */
  minRepMs: number
  /** Every one must hold for the rep to count (e.g. feet side by side, not a lunge). */
  requires?: RepRequirement[]
  /**
   * A "partial rep": went below this but never reached `downBelow`, then came back up.
   * Not counted; `partialText` is shown instead (e.g. "Go deeper").
   */
  partialBelow?: number
  partialText?: string
  /** Shown before the first rep, until the user is in the start position. */
  startText: string
}

/**
 * A test on one rep: take that rep's lowest (`min`), highest (`max`) or typical (`median`) value
 * of a metric and compare it. Example: { metric: 'knee', stat: 'min', op: '>', value: 95 } =
 * "never got below 95°". Use `median` when brief tracking errors shouldn't decide the result.
 */
export type Condition = {
  metric: Metric
  stat: 'min' | 'max' | 'median'
  op: '<' | '>'
  value: number
}

/**
 * A rule a rep must pass to be counted, with what to tell the user when it fails.
 * It passes if ANY of `anyOf` holds — so "not a lunge" can be written as
 * "feet look level OR balance looks like a squat", and needs both signals to agree before rejecting.
 */
export type RepRequirement = {
  id: string
  text: string
  anyOf: Condition[]
}

/** A form check run at the end of each counted rep (from Step 10). Fires when the condition is true. */
export type CueCheck = Condition & {
  id: string
  /** Short line shown on screen and spoken: what to do, 1–3 words, external focus where possible. */
  text: string
  /** Said on the first clean rep after this cue, naming the fix (e.g. "Nice depth"). */
  praise: string
  /** One plain sentence for the end-of-set summary: what to do next time. */
  tip: string
  /**
   * 'safety' = injury risk (e.g. lower-back load): said on the first rep it happens.
   * 'technique' = progress/efficiency: said once it's a pattern (2 of the last 3 reps).
   * 'minor' = worth mentioning only if it keeps happening (3 of the last 4 reps).
   */
  kind: 'safety' | 'technique' | 'minor'
  /** Lower number wins when several checks fail on the same rep. */
  priority: number
}

export type Exercise = {
  id: string
  name: string
  /** One line for the home screen. */
  summary: string
  /** The form points Spotter checks, in plain words. */
  checks: string[]
  camera: CameraHint
  /** If any of these are out of frame, counting pauses and the user is asked to move back. */
  mustSee: BodyPart[]
  /** Short set-up tips shown before starting (device placement is added automatically from `camera`). */
  tips: string[]
  /** How reps are counted. Missing = counting not built for this exercise yet. */
  reps?: RepRule
  /** Form checks run after each rep. */
  cues?: CueCheck[]
}
