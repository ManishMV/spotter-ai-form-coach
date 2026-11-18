// After each counted rep, pick the single most important form fix to tell the user (or none).
import type { Condition, CueCheck } from '../exercises/types'
import type { RepStats } from './repCounter'

/**
 * A cue fires when its condition is true for this rep. Unlike rep requirements, an unknown value
 * (body part not seen) never fires a cue: we only coach on what we actually saw.
 */
function holds(c: Condition, stats: RepStats): boolean {
  const v = stats[c.metric][c.stat]
  if (v === null) return false
  return c.op === '<' ? v < c.value : v > c.value
}

function fires(cue: CueCheck, stats: RepStats): boolean {
  return holds(cue, stats) && (cue.and ?? []).every((c) => holds(c, stats))
}

/** Every cue that fires for this rep (for the per-rep log). */
export function firingCues(cues: CueCheck[] | undefined, stats: RepStats): CueCheck[] {
  return (cues ?? []).filter((c) => fires(c, stats))
}

/** The highest-priority cue that fires (lowest `priority` number), or null for a clean rep. */
export function pickCue(cues: CueCheck[] | undefined, stats: RepStats): CueCheck | null {
  if (!cues) return null
  const firing = cues.filter((c) => fires(c, stats))
  firing.sort((a, b) => a.priority - b.priority)
  return firing[0] ?? null
}
