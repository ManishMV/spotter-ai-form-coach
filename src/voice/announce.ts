// What the user hears when a rep finishes. Shared by the workout screen and the Test lab,
// so the lab plays exactly what a real set would.
//
// Speech policy (like a real coach): fast sets produce events faster than speech, so not
// everything can be said. Without rules, cues interrupt each other and come out jammed together.
//   1. Ranked: safety cue > reason a rep didn't count > technique cue > praise > rep number.
//      A message may only cut off something LESS important than itself.
//   2. Breathing room: after the coach speaks, other coaching waits ~3 s (reasons ~1.5 s, safety
//      cues ~1.2 s); anything sooner is shown on screen only.
//   3. Nothing said late: a message that has to wait is dropped if it can't start within ~1 s.
//   4. One short line per rep: the cue OR the number, never bundled. Numbers only into silence;
//      the chime still marks every rep.
//   5. "Two more" near a target only while resting, never attached to a rep.
import type { Feedback } from '../coach/feedback'
import type { Rep } from '../coach/repCounter'
import { voice } from './index'
import { playNoRepSound, playRepSound, playSound } from './sounds'

const RANK = { number: 0, praise: 1, technique: 2, reason: 3, safety: 4 } as const
type Rank = (typeof RANK)[keyof typeof RANK]

/** Minimum quiet time after the last coaching message, per rank (ms). */
const COOLDOWN: Record<Rank, number> = { 0: 0, 1: 3000, 2: 3000, 3: 1500, 4: 1200 }
const MAX_WAIT_MS = 1000 // a waiting message older than this is dropped

let lastCoachAt = -Infinity
let currentRank: Rank | -1 = -1

/** Reset between sets (so the first cue of a new set isn't held back). */
export function resetSpeechPolicy() {
  lastCoachAt = -Infinity
  currentRank = -1
}

function rankOf(rep: Rep, feedback: Feedback | null): Rank | null {
  if (!rep.counted) return rep.failed ? RANK.reason : null
  if (!feedback || feedback.text === 'Good rep') return null // plain praise stays on screen only
  if (feedback.tone === 'good') return RANK.praise
  return feedback.kind === 'safety' ? RANK.safety : RANK.technique
}

/**
 * Chime / low tone always play (they mark every rep). Then the policy decides what, if anything,
 * is said: "Four.", "Four. Chest up.", "A bit deeper." or nothing.
 */
export function announceRep(
  rep: Rep,
  feedback: Feedback | null,
  countAloud: boolean,
  /** This rep completed the target: its number is always said (waiting its turn if needed). */
  isFinal = false,
  now = Date.now(),
) {
  if (rep.counted) playRepSound()
  else if (rep.failed) playNoRepSound()

  if (!voice.isSpeaking()) currentRank = -1
  const rank = rankOf(rep, feedback)
  const coaching = rank === null ? null : rep.counted ? feedback!.text : rep.failed!.text
  const allowed = rank !== null && now - lastCoachAt >= COOLDOWN[rank]

  // One short line per rep: the cue OR the number, never both bundled ("Chest up", not "Four. Chest up").
  // The chime marks every rep and the screen shows the count, so nothing is lost.
  if (coaching && allowed) {
    if (rank! > currentRank) {
      voice.say(coaching, { interrupt: true }) // more important than what's playing (or nothing playing)
      currentRank = rank!
    } else {
      voice.say(coaching, { interrupt: false, expiresInMs: MAX_WAIT_MS }) // wait briefly, or drop
    }
    lastCoachAt = now
    return
  }

  // The rep that completes the target is always counted out loud, after whatever is playing.
  if (isFinal && countAloud && rep.counted) {
    voice.say(String(rep.number), { interrupt: false, expiresInMs: 2500 })
    return
  }

  // Nothing to coach (or it's held back): just the number, and only into silence.
  if (countAloud && rep.counted && !voice.isSpeaking()) {
    voice.say(String(rep.number), { interrupt: false, expiresInMs: 300 })
    currentRank = RANK.number
  }
}

/**
 * Encouragement while resting near a rep target ("Two more"). Only into silence, and only when nothing
 * was said in the last few seconds, so it never clashes with coaching.
 */
export function announceRestLine(text: string, now = Date.now()) {
  if (voice.isSpeaking() || now - lastCoachAt < 2000) return false
  voice.say(text, { interrupt: false, expiresInMs: 300 })
  lastCoachAt = now
  return true
}

/**
 * End of set: wait for the coach to finish what they're saying (so nothing is cut off), pause, play the
 * set-complete sound on its own, then say the closing line after it, never on top of it.
 * Returns a cancel function (e.g. if the user leaves the summary straight away).
 */
export function announceSetComplete(closingLine: string): () => void {
  let cancelled = false
  const timers: number[] = []
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => !cancelled && fn(), ms))
  const MAX_WAIT_MS = 2500
  const startedAt = Date.now()
  const whenQuiet = () => {
    if (voice.isSpeaking() && Date.now() - startedAt < MAX_WAIT_MS) return later(100, whenQuiet)
    later(400, () => {
      playSound('set-complete')
      later(800, () => voice.say(closingLine, { interrupt: true }))
    })
  }
  whenQuiet()
  return () => {
    cancelled = true
    timers.forEach((t) => window.clearTimeout(t))
  }
}
