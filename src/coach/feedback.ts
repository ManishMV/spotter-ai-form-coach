// Decides what to say after each rep, following motor-learning research on feedback:
// - Bandwidth: only coach a fault outside its threshold (Sherwood 1988; Lee & Carnahan 1990).
// - Weighted by risk:
//   · Safety cues (injury risk, e.g. lower-back load) speak up on the FIRST rep and may repeat every
//     2nd rep while the fault continues — the cost of staying quiet is higher than a rare false alarm.
//   · Technique cues wait for a pattern: 2 of the last 3 reps (Myer 2014 scores a fault at 2+ of 10),
//     and repeat at most every 3rd rep (OPTIMAL: "occasionally ignoring mistakes").
//   · Minor cues only if it keeps happening: 3 of the last 4 reps, at most every 4th rep.
// - Not too chatty: a non-safety cue stays quiet if any cue was shown on the previous rep.
// - Praise: name the fix on the first clean rep after a cue; otherwise "Good rep" every few clean
//   reps (Chiviacowsky & Wulf 2007: feedback after good trials helps learning).
// Reps that don't count always say why — that's information about the count, not coaching.
import type { CueCheck } from '../exercises/types'
import { pickCue } from './cueEngine'
import type { Rep } from './repCounter'

export type Feedback = { text: string; tone: 'fix' | 'good' | 'reject' }

const RULES = {
  safety: { window: 3, persist: 1, minGap: 2 }, // first occurrence; repeat at most every 2nd rep
  technique: { window: 3, persist: 2, minGap: 3 }, // 2 of the last 3 reps; at most every 3rd rep
  minor: { window: 4, persist: 3, minGap: 4 }, // 3 of the last 4 reps; at most every 4th rep
}
const HISTORY = 4 // remember the faults of the last 4 counted reps
const PRAISE_EVERY = 4 // "Good rep" every 4th clean rep (the first clean rep included)

export class CoachFeedback {
  private recentFaults: (string | null)[] = []
  private lastSaid = new Map<string, number>() // cue id → rep number when last said
  private repIndex = 0
  private lastCueRep = -Infinity // rep number of the last fix cue shown (any cue)
  private awaitingPraise: CueCheck | null = null // last cue said, until a clean rep shows it's fixed
  private cleanSincePraise = PRAISE_EVERY - 1 // so the first clean rep gets a "Good rep"
  private readonly cues: CueCheck[]

  constructor(cues: CueCheck[] = []) {
    this.cues = cues
  }

  /** What to show (and later say) after this rep, or null to stay quiet. */
  next(rep: Rep): Feedback | null {
    this.repIndex += 1
    if (!rep.counted) return rep.failed ? { text: rep.failed.text, tone: 'reject' } : null

    const fault = pickCue(this.cues, rep.stats)
    this.recentFaults = [...this.recentFaults, fault?.id ?? null].slice(-HISTORY)

    if (fault) {
      const { window, persist, minGap } = RULES[fault.kind]
      const seenTimes = this.recentFaults.slice(-window).filter((id) => id === fault.id).length
      const last = this.lastSaid.get(fault.id)
      const quietLongEnough = last === undefined || this.repIndex - last >= minGap
      const breather = fault.kind === 'safety' || this.repIndex - this.lastCueRep > 1
      if (seenTimes >= persist && quietLongEnough && breather) {
        this.lastSaid.set(fault.id, this.repIndex)
        this.lastCueRep = this.repIndex
        this.awaitingPraise = fault
        this.cleanSincePraise = 0
        return { text: fault.text, tone: 'fix' }
      }
      return null
    }

    // Clean rep.
    if (this.awaitingPraise) {
      const praise = this.awaitingPraise.praise
      this.awaitingPraise = null
      this.cleanSincePraise = 0
      return { text: praise, tone: 'good' }
    }
    this.cleanSincePraise += 1
    if (this.cleanSincePraise >= PRAISE_EVERY) {
      this.cleanSincePraise = 0
      return { text: 'Good rep', tone: 'good' }
    }
    return null
  }
}
