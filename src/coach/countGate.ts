// Should this frame go to the rep counter? Shared by the workout screen and the accuracy evals (src/eval).
// Pause counting when a needed body part is out of frame (can't judge what we can't see) or when facing the
// camera (side-view checks don't work). Exception: a brief drop out of view in the middle of a rep. At the
// bottom of a very deep squat the feet or knees can slip out of sight for a moment; pausing then missed the
// deepest point and wrongly said "Sit deeper" (Nov 14). Angles for parts the tracker can't see stay empty.
import type { RepPhase } from './repCounter'

const OUT_OF_VIEW_GRACE_MS = 1500

export class CountGate {
  private outOfViewSince: number | null = null

  allow(phase: RepPhase, facing: boolean, inView: boolean, timeMs: number): boolean {
    if (facing) return false
    if (inView) {
      this.outOfViewSince = null
      return true
    }
    this.outOfViewSince ??= timeMs
    // Only while actually going down/up in a squat or push-up: between reps (standing, or walking up to the
    // device) a cut-off body pauses at once, so jittery points can't make a fake rep (Nov 14).
    return phase === 'down' && timeMs - this.outOfViewSince <= OUT_OF_VIEW_GRACE_MS
  }
}
