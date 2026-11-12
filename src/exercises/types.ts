// What every exercise file describes. Step 7 adds the counting thresholds and cue checks.
export type CameraHint = {
  /** Where the phone sits. */
  height: 'hip' | 'floor'
  /** How far away, shown to the user. */
  distance: string
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
}
