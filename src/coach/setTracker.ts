// Keeps score during a set, for the end-of-set summary: reps counted, reps that didn't count (and why),
// and which form issues came up most. Form issues are tallied on every counted rep, whatever the
// coaching setting, so the summary reflects what actually happened.
import type { CueCheck } from '../exercises/types'
import { pickCue } from './cueEngine'
import type { Rep } from './repCounter'

export type SetSummary = {
  reps: number
  /** Reps that didn't count, grouped by reason, most frequent first. */
  missed: { reason: string; count: number }[]
  /** The form issue to work on next time, weighted by risk (null = clean set). */
  focus: { cue: CueCheck; count: number } | null
  /** Counted reps with no form issue. */
  cleanReps: number
  durationMs: number
  /** The rep target, if one was set. */
  target: number | null
  /** Form cues shown during the set, most frequent first (for tester results). */
  cues: { text: string; count: number }[]
  /** Device and tracking speed, added by the workout screen (for tester results). */
  tech?: { device: string; model: string; fps: number }
}

export class SetTracker {
  private reps = 0
  private clean = 0
  private missed = new Map<string, number>()
  private cuesShown = new Map<string, number>()
  private faults = new Map<string, { cue: CueCheck; count: number }>()
  private startedAt: number | null = null
  private readonly cues: CueCheck[]
  private readonly target: number | null

  constructor(cues: CueCheck[] = [], target: number | null = null) {
    this.cues = cues
    this.target = target
  }

  /** Call when counting starts ("Go"). */
  start(now = Date.now()) {
    this.startedAt ??= now
  }

  onRep(rep: Rep) {
    if (!rep.counted) {
      const reason = rep.failed?.text
      if (reason) this.missed.set(reason, (this.missed.get(reason) ?? 0) + 1)
      return
    }
    this.reps = rep.number
    const fault = pickCue(this.cues, rep.stats)
    if (!fault) {
      this.clean += 1
      return
    }
    const entry = this.faults.get(fault.id) ?? { cue: fault, count: 0 }
    entry.count += 1
    this.faults.set(fault.id, entry)
  }

  /** A form cue was shown (and maybe spoken) during the set. */
  onCue(text: string) {
    this.cuesShown.set(text, (this.cuesShown.get(text) ?? 0) + 1)
  }

  summary(now = Date.now()): SetSummary {
    const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count
    // The one issue to work on: weighted by risk, like the live cues — safety counts double, minor half.
    // Ties go to the higher-priority cue. So one lower-back issue outranks a depth issue seen twice,
    // but a technique issue that keeps happening (3+ times) still comes first.
    const WEIGHT = { safety: 2, technique: 1, minor: 0.5 }
    const score = (f: { cue: CueCheck; count: number }) => f.count * WEIGHT[f.cue.kind]
    const focus =
      [...this.faults.values()].sort((a, b) => score(b) - score(a) || a.cue.priority - b.cue.priority)[0] ?? null
    return {
      reps: this.reps,
      missed: [...this.missed].map(([reason, count]) => ({ reason, count })).sort(byCount),
      focus,
      cleanReps: this.clean,
      durationMs: this.startedAt === null ? 0 : now - this.startedAt,
      target: this.target,
      cues: [...this.cuesShown].map(([text, count]) => ({ text, count })).sort(byCount),
    }
  }
}
