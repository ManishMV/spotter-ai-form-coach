// The exercise list. Adding an exercise = one new file + one line here.
import { pushup } from './pushup'
import { squat } from './squat'

export const EXERCISES = [squat, pushup]
export type { Exercise } from './types'
