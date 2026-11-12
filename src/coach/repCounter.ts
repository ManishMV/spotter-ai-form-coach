// Counts reps from one metric (e.g. knee angle) using two thresholds, and records each rep's
// lowest/highest value of every metric so form cues (Step 10) can judge the rep afterwards.
import type { Angles } from './angles'
import type { Metric, RepRule } from '../exercises/types'

/** waiting = haven't seen the top position yet; up = at/near the top; down = in the bottom half. */
export type RepPhase = 'waiting' | 'up' | 'down'

export type RepStats = Record<Metric, { min: number | null; max: number | null }>

export type Rep = { number: number; durationMs: number; stats: RepStats }

const METRICS: Metric[] = ['knee', 'hip', 'elbow', 'torsoLean', 'bodyLine']

const freshStats = (): RepStats =>
  Object.fromEntries(METRICS.map((m) => [m, { min: null, max: null }])) as RepStats

export class RepCounter {
  count = 0
  phase: RepPhase = 'waiting'
  private stats = freshStats()
  private startMs = 0
  private readonly rule: RepRule

  constructor(rule: RepRule) {
    this.rule = rule
  }

  /** Feed one frame. Returns the finished rep on the frame a rep is counted, otherwise null. */
  update(angles: Angles, timeMs: number): Rep | null {
    const value = angles[this.rule.metric]
    if (value === null) return null // joint hidden this frame: keep the current state

    const { downBelow, upAbove, minRepMs } = this.rule
    const atTop = value > upAbove

    if (this.phase === 'waiting') {
      if (atTop) this.restart(timeMs)
      return null
    }

    if (this.phase === 'up') {
      // While standing tall, keep restarting so the rep is timed from the moment you leave the top.
      if (atTop) this.restart(timeMs)
      else if (value < downBelow) this.phase = 'down'
      this.record(angles)
      return null
    }

    // phase === 'down'
    this.record(angles)
    if (!atTop) return null

    const durationMs = timeMs - this.startMs
    const stats = this.stats
    this.restart(timeMs)
    if (durationMs < minRepMs) return null // too fast to be real: probably a tracking glitch
    this.count += 1
    return { number: this.count, durationMs, stats }
  }

  reset() {
    this.count = 0
    this.phase = 'waiting'
    this.stats = freshStats()
  }

  private restart(timeMs: number) {
    this.phase = 'up'
    this.startMs = timeMs
    this.stats = freshStats()
  }

  private record(angles: Angles) {
    for (const m of METRICS) {
      const v = angles[m]
      if (v === null) continue
      const s = this.stats[m]
      s.min = s.min === null ? v : Math.min(s.min, v)
      s.max = s.max === null ? v : Math.max(s.max, v)
    }
  }
}
