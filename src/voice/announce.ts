// What the user hears when a rep finishes. Shared by the workout screen and the Test lab,
// so the lab plays exactly what a real set would.
import type { Feedback } from '../coach/feedback'
import type { Rep } from '../coach/repCounter'
import { voice } from './index'
import { playNoRepSound, playRepSound } from './sounds'

/**
 * Counted → chime, then the number (if counting out loud) and any cue in one phrase: "Four. Chest up."
 * Not counted → low tone, then the reason: "Sit deeper."
 * Plain "Good rep" stays on screen only; spoken praise is kept for naming a fix ("Nice depth").
 */
export function announceRep(rep: Rep, feedback: Feedback | null, countAloud: boolean) {
  if (rep.counted) {
    playRepSound()
    const spokenFeedback = feedback && feedback.text !== 'Good rep' ? feedback.text : null
    const parts = [countAloud ? String(rep.number) : null, spokenFeedback].filter(Boolean)
    // A plain number waits its turn, so it never cuts off a cue still being spoken;
    // a rep that carries a cue is newer, more useful information and may interrupt.
    voice.say(parts.join('. '), { interrupt: spokenFeedback !== null })
  } else if (rep.failed) {
    playNoRepSound()
    voice.say(rep.failed.text, { interrupt: true })
  }
}
