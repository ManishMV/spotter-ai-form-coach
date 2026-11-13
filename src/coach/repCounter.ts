// Counts reps from one metric (e.g. knee angle) using two thresholds, and records each rep's
// lowest/highest value of every metric so form cues (Step 10) can judge the rep afterwards.
import type { Angles } from './angles'
import type { Metric, RepRequirement, RepRule } from '../exercises/types'
import { passes } from './conditions'

/** waiting = haven't seen the top position yet; up = at/near the top; down = in the bottom half. */
export type RepPhase = 'waiting' | 'up' | 'down'

export type RepStats = Record<Metric, { min: number | null; max: number | null; median: number | null }>

/**
 * A finished rep. `counted` is false when it broke a rule-pack requirement (e.g. lunge stance);
 * `failed` says which one, so the screen can tell the user why it didn't count.
 */
export type Rep = {
  number: number
  durationMs: number
  stats: RepStats
  counted: boolean
  failed: RepRequirement | null
  /** True for a partial rep (went partway down, came back up without reaching depth). */
  partial: boolean
}

/**
 * Push-up "on the floor" position: shoulders well below the elbows (upper arm more than 15° below
 * parallel). A controlled deep rep passes through it in a fraction of a second; resting on the
 * floor stays there. The time spent here becomes `collapsedMs`, and the cue uses a time limit.
 */
const isRestingOnFloor = (a: Angles) => a.upperArm !== null && a.upperArm < -15

/** Anything shorter than this is a tracking blip, not a movement. */
const GLITCH_MS = 350

const METRICS: Metric[] = ['knee', 'hip', 'elbow', 'torsoLean', 'bodyLine', 'stanceSplit', 'balance', 'upperArm', 'kneeLift', 'leanVsShin', 'heelLift', 'hipOffset', 'thighTilt', 'hipsRiseFirst', 'leanAtBottom', 'footTilt', 'descentMs', 'collapsedMs']

const freshStats = (): RepStats =>
  Object.fromEntries(METRICS.map((m) => [m, { min: null, max: null, median: null }])) as RepStats

const median = (values: number[]) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export class RepCounter {
  count = 0
  phase: RepPhase = 'waiting'
  private stats = freshStats()
  /** Every value seen this rep, per metric (for medians). */
  private samples: Record<Metric, number[]> = this.freshSamples()
  private startMs = 0
  private readonly rule: RepRule
  /** For hipsRiseFirst: torso lean at the deepest point, and the most it leaned after that. */
  private bottom: { value: number; lean: number | null; leanAfter: number | null; timeMs: number } | null = null
  /** Time resting on the floor this rep, and the previous frame's time (for frame durations). */
  private collapsedMs = 0
  /** Torso-vs-shin lean on each frame in the bottom half of the rep (for leanAtBottom). */
  private bottomLeans: number[] = []
  private lastFrameMs: number | null = null

  constructor(rule: RepRule) {
    this.rule = rule
  }

  /** Feed one frame. Returns the rep on the frame it finishes (counted or not), otherwise null. */
  update(angles: Angles, timeMs: number): Rep | null {
    const value = angles[this.rule.metric]
    if (value === null) return null // joint hidden this frame: keep the current state

    const { downBelow, upAbove, minRepMs } = this.rule
    const atTop = value > upAbove
    const frameMs = this.lastFrameMs === null ? 0 : Math.min(timeMs - this.lastFrameMs, 100)
    this.lastFrameMs = timeMs
    if (this.phase !== 'waiting' && isRestingOnFloor(angles)) this.collapsedMs += frameMs

    if (this.phase === 'waiting') {
      if (atTop) this.restart(timeMs, angles)
      return null
    }

    if (this.phase === 'up') {
      if (atTop) {
        // Back at the top without reaching depth: was it a partial rep?
        const { partialBelow, partialText } = this.rule
        const lowest = this.stats[this.rule.metric].min
        const durationMs = timeMs - this.startMs
        const stats = this.finishStats()
        // Half the full-rep time: a shallow dip spends less time below the standing line than a full rep,
        // and a quick one was missed (silent) in testing. Still long enough to ignore a wobble.
        if (partialBelow !== undefined && lowest !== null && lowest < partialBelow && durationMs >= minRepMs / 2) {
          this.restart(timeMs, angles) // a finished (partial) rep: start the next one fresh
          const failed: RepRequirement = { id: 'partial', text: partialText ?? 'Go deeper', anyOf: [] }
          return { number: this.count, durationMs, stats, counted: false, failed, partial: true }
        }
        // While at the top, keep restarting so the rep is timed from the moment you leave the top —
        // but keep the top's lowest/highest values, so checks on the start position see all of it.
        this.restart(timeMs, angles, stats)
        return null
      }
      if (value < downBelow) this.phase = 'down'
      this.record(angles)
      return null
    }

    // phase === 'down'
    this.record(angles)
    if (angles.leanVsShin !== null) this.bottomLeans.push(angles.leanVsShin)
    this.trackAscent(value, angles.torsoLean, timeMs)
    if (!atTop) return null

    const durationMs = timeMs - this.startMs
    const stats = this.finishStats()
    this.restart(timeMs, angles)
    if (durationMs < GLITCH_MS) return null // a blip in tracking, not a real movement
    if (durationMs < minRepMs) {
      // A real but rushed rep (bouncing): don't count it, and say why.
      const failed: RepRequirement = { id: 'too-fast', text: 'Slow down', anyOf: [] }
      return { number: this.count, durationMs, stats, counted: false, failed, partial: false }
    }
    const failed = this.rule.requires?.find((r) => !passes(r, stats)) ?? null
    if (!failed) this.count += 1
    return { number: this.count, durationMs, stats, counted: !failed, failed, partial: false }
  }

  reset() {
    this.count = 0
    this.phase = 'waiting'
    this.stats = freshStats()
    this.samples = this.freshSamples()
  }

  private restart(timeMs: number, angles?: Angles, carryTopExtremes?: RepStats) {
    this.phase = 'up'
    this.startMs = timeMs
    this.stats = freshStats()
    this.samples = this.freshSamples()
    this.bottom = null
    this.collapsedMs = 0
    this.bottomLeans = []
    // Still at the top: carry over the top's min/max (not medians) so the next rep's stats
    // include the whole start position, e.g. the most upright body angle at the top, which
    // tells a knee push-up from a full one.
    if (carryTopExtremes) {
      for (const m of METRICS) {
        this.stats[m].min = carryTopExtremes[m].min
        this.stats[m].max = carryTopExtremes[m].max
      }
    }
    if (angles) this.record(angles)
  }

  private freshSamples() {
    return Object.fromEntries(METRICS.map((m) => [m, [] as number[]])) as Record<Metric, number[]>
  }

  /** The rep's stats with medians filled in, plus per-rep metrics. */
  private finishStats(): RepStats {
    for (const m of METRICS) this.stats[m].median = median(this.samples[m])
    const one = (v: number) => ({ min: v, max: v, median: v })
    const b = this.bottom
    if (b && b.lean !== null && b.leanAfter !== null) this.stats.hipsRiseFirst = one(b.leanAfter - b.lean)
    if (b) this.stats.descentMs = one(b.timeMs - this.startMs)
    this.stats.collapsedMs = one(this.collapsedMs)
    const leanAtBottom = median(this.bottomLeans)
    if (leanAtBottom !== null) this.stats.leanAtBottom = one(leanAtBottom)
    return this.stats
  }

  /**
   * Myer 2014 criterion 10: hips and shoulders should rise together. If the torso tips further
   * forward after the deepest point, the hips are shooting up first.
   */
  private trackAscent(value: number, lean: number | null, timeMs: number) {
    if (!this.bottom || value < this.bottom.value) {
      this.bottom = { value, lean, leanAfter: lean, timeMs } // new deepest point
    } else if (lean !== null) {
      this.bottom.leanAfter = this.bottom.leanAfter === null ? lean : Math.max(this.bottom.leanAfter, lean)
    }
  }

  private record(angles: Angles) {
    for (const m of METRICS) {
      const v = angles[m]
      if (v === null) continue
      this.samples[m].push(v)
      const s = this.stats[m]
      s.min = s.min === null ? v : Math.min(s.min, v)
      s.max = s.max === null ? v : Math.max(s.max, v)
    }
  }
}
