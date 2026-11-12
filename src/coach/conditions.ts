// Checks a rule-pack Condition against one rep's stats. Shared by rep requirements and form cues.
import type { Condition } from '../exercises/types'
import type { RepStats } from './repCounter'

/** True when the condition holds. Unknown (metric never seen this rep) counts as "holds", so a
 *  hidden joint can't make a good rep fail. */
export function holds(c: Condition, stats: RepStats): boolean {
  const v = stats[c.metric][c.stat]
  if (v === null) return true
  return c.op === '<' ? v < c.value : v > c.value
}
