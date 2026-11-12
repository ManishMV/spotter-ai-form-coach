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
  | 'balance' // front-to-back distance between shoulder and the visible ankle ÷ leg length. Uses only
  //           visible points. Squat ≈ shoulders over feet (small); lunge = shoulders between two far-apart feet (big).

/** Body points (on the side facing the camera) an exercise needs to see to judge a rep. */
export type BodyPart = 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle'

export type CameraHint = {
  /** Where the phone or laptop sits. */
  height: 'hip' | 'floor'
  /** How far away, shown to the user. */
  distance: string
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
  /** Short line shown on screen and spoken. */
  text: string
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
