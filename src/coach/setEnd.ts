// Decides when a set is over, so users don't have to walk back and tap End:
//   • Rep target reached (optional; chosen on the setup screen). Near the target, "Three more / Two more /
//     Last one" is said only while the user rests (~3.5 s), never attached to a rep, so it can't clash.
//   • Inactivity: no rep for a while → "Finishing the set" + 5-4-3-2-1 ticks → end. Any rep cancels it.
// Shared by the workout screen and the Test lab, so the lab behaves exactly like a real set.

/** Seconds of no reps before Spotter offers to finish (not counted while mid-rep). */
export const IDLE_MS = 12000
/** Pause near the target before a "Two more" nudge. */
const REST_NUDGE_MS = 3500
/** The "Finishing the set… 5, 4, 3, 2, 1" warning: time to start another rep and cancel it. */
const WARNING_STEPS = ['Finishing the set', '5', '4', '3', '2', '1'] as const

export type EndEvent =
  | { type: 'say'; text: string; tick: boolean } // part of the finishing warning
  | { type: 'cancelled' } // a rep happened during the warning
  | { type: 'rest'; text: string } // resting near the target: "Two more"
  | { type: 'end'; reason: 'target' | 'idle' }

export class SetEnder {
  private lastActivity: number
  private attempted = false
  private warningAt: number | null = null
  private warningStep = 0
  private counted = 0
  private nudged = new Set<number>() // "N more" already said for these remaining counts
  private readonly target: number | null

  constructor(target: number | null, now: number) {
    this.target = target
    this.lastActivity = now
  }

  /** Reps left to the target, or null without a target. */
  remaining(counted: number): number | null {
    return this.target === null ? null : Math.max(0, this.target - counted)
  }

  /** "Three more" / "Two more" / "Last one" after a counted rep, or null. */
  countdownLine(counted: number): string | null {
    const left = this.remaining(counted)
    return left === 3 ? 'Three more' : left === 2 ? 'Two more' : left === 1 ? 'Last one' : null
  }

  /** Any rep (counted or not) or movement into the bottom of a rep counts as activity. */
  onActivity(now: number): EndEvent | null {
    this.attempted = true
    this.lastActivity = now
    if (this.warningAt === null) return null
    this.warningAt = null // they kept going: cancel the finishing warning
    this.warningStep = 0
    return { type: 'cancelled' }
  }

  /** After a counted rep: did that hit the target? */
  reachedTarget(counted: number): boolean {
    this.counted = counted
    return this.target !== null && counted >= this.target
  }

  /**
   * Call regularly (every ~100 ms; steps are timed from when the warning began, so they stay 1 s apart). `midRep` = the user is in the bottom half of a rep, so
   * they're clearly not done. Returns at most one event to act on.
   */
  tick(now: number, midRep: boolean): EndEvent | null {
    if (!this.attempted || midRep) return null // never finish before the first rep, or mid-rep
    if (this.warningAt === null) {
      const idle = now - this.lastActivity
      // Resting near the target: one short nudge per remaining count.
      const left = this.remaining(this.counted)
      if (left !== null && left >= 1 && left <= 3 && idle >= REST_NUDGE_MS && idle < IDLE_MS && !this.nudged.has(left)) {
        this.nudged.add(left)
        return { type: 'rest', text: this.countdownLine(this.counted)! }
      }
      if (idle < IDLE_MS) return null
      this.warningAt = now
      this.warningStep = 1
      return { type: 'say', text: WARNING_STEPS[0], tick: false }
    }
    // One warning step per second after "Finishing the set" (which gets 1.5 s to be said).
    const due = 1500 + (this.warningStep - 1) * 1000
    if (now - this.warningAt < due) return null
    if (this.warningStep < WARNING_STEPS.length) {
      const text = WARNING_STEPS[this.warningStep++]
      return { type: 'say', text, tick: true }
    }
    this.warningAt = null
    return { type: 'end', reason: 'idle' }
  }
}
