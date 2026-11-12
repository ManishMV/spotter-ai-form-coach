// What every exercise file ("rule pack") describes. Adding an exercise = one new file using this shape.

/** Body measurements Spotter tracks every frame, all in degrees. */
export type Metric =
  | 'knee' // hip–knee–ankle. 180 = straight leg.
  | 'hip' // shoulder–hip–knee. 180 = standing tall.
  | 'elbow' // shoulder–elbow–wrist. 180 = straight arm.
  | 'torsoLean' // shoulder–hip line vs. vertical. 0 = upright, 90 = horizontal.
  | 'bodyLine' // shoulder–hip–ankle. 180 = straight plank line.

export type CameraHint = {
  /** Where the phone sits. */
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
}

/**
 * A form check, run once at the end of each rep against that rep's lowest (`min`) or highest
 * (`max`) value of a metric. Example: "if the lowest knee angle was above 95°, say Go deeper".
 * Used from Step 10.
 */
export type CueCheck = {
  id: string
  metric: Metric
  stat: 'min' | 'max'
  op: '<' | '>'
  value: number
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
  /** Short set-up tips shown before starting. */
  tips: string[]
  /** How reps are counted. Missing = counting not built for this exercise yet. */
  reps?: RepRule
  /** Form checks run after each rep. */
  cues?: CueCheck[]
}
