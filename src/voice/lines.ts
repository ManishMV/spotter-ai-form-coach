// Every line Spotter can say, built from the exercise rule packs so it never drifts out of sync.
// Used by the clip generator (one audio clip per line) and the clip player (text → clip).
import { pushup } from '../exercises/pushup'
import { squat } from '../exercises/squat'

/** Where-to-stand prompts (shown and spoken). */
export const POSITION = {
  stepIntoView: 'Step into view, side-on',
  moveBack: 'Move back so your whole body is in view',
  // Named versions, so users know what's cut off (the whole body isn't always needed).
  moveBackFeet: 'Move back so your feet are in view',
  moveBackKnees: 'Move back so your knees are in view',
  moveBackHands: 'Move back so your hands are in view',
  turn: 'Turn to your side',
  rotate: 'Turn your phone sideways', // push-ups on a phone held upright: the body doesn't fit
} as const

/** The "move back" prompt for what's missing: the lowest body part out of view, or the whole body. */
export function moveBackPrompt(missing: string[]): string {
  if (missing.includes('ankle')) return POSITION.moveBackFeet
  if (missing.includes('knee')) return POSITION.moveBackKnees
  if (missing.includes('wrist') || missing.includes('elbow')) return POSITION.moveBackHands
  return POSITION.moveBack
}

const NUMBER_WORDS = [
  'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
  'Twenty-one', 'Twenty-two', 'Twenty-three', 'Twenty-four', 'Twenty-five', 'Twenty-six', 'Twenty-seven', 'Twenty-eight', 'Twenty-nine', 'Thirty',
  'Thirty-one', 'Thirty-two', 'Thirty-three', 'Thirty-four', 'Thirty-five', 'Thirty-six', 'Thirty-seven', 'Thirty-eight', 'Thirty-nine', 'Forty',
  'Forty-one', 'Forty-two', 'Forty-three', 'Forty-four', 'Forty-five', 'Forty-six', 'Forty-seven', 'Forty-eight', 'Forty-nine', 'Fifty',
]
/** Rep numbers with clips: 1–50 (higher numbers fall back to browser speech). */
export const MAX_NUMBER_CLIP = NUMBER_WORDS.length

/** Stable file-friendly id for a line: "Chest up" → "chest-up", "6" or "Six" → "n-6". */
export function lineId(text: string): string {
  const t = text.trim()
  if (/^\d+$/.test(t)) return `n-${t}`
  const asWord = NUMBER_WORDS.findIndex((w) => w.toLowerCase() === t.toLowerCase())
  if (asWord >= 0) return `n-${asWord + 1}` // "Six" → same clip as "6"
  return t
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** What a line is for — it shapes how it's delivered (see scripts/delivery.ts). */
export type LineKind = 'number' | 'start' | 'prompt' | 'cue' | 'praise' | 'reason' | 'intro'

/** `text` is the plain line ("Chest up"); delivery styles add punctuation and tone when generating. */
export type Line = { id: string; text: string; kind: LineKind }

/** Each coach introduces themselves when picked on the setup screen (one sentence = one clip). */
export const introLine = (coachName: string) => `Hi, I'm ${coachName}, and I'll be your coach today`

/**
 * The full catalogue: id + the exact text sent to ElevenLabs (ending punctuation shapes delivery).
 * With a coach name, that coach's introduction is included too (only their own folder needs it).
 */
export function allLines(coachName?: string): Line[] {
  const kinds = new Map<string, LineKind>() // first kind wins if a line is used twice
  const add = (kind: LineKind, t?: string) => t && !kinds.has(t) && kinds.set(t, kind)
  if (coachName) add('intro', introLine(coachName))
  add('start', 'Get ready')
  add('start', 'Get in position')
  add('start', 'Go')
  add('start', 'Three more')
  add('start', 'Two more')
  add('start', 'Last one')
  add('prompt', 'Finishing the set')
  add('praise', 'Nice work')
  add('praise', 'Great set')
  add('praise', 'Good effort')
  add('praise', 'Good start')
  Object.values(POSITION).forEach((t) => add('prompt', t))
  for (const e of [squat, pushup]) {
    add('prompt', e.reps?.startText)
    e.cues?.forEach((c) => add('cue', c.text)) // if a line is both a cue and a reason, coach it as a cue
    e.cues?.forEach((c) => add('praise', c.praise))
    add('reason', e.reps?.partialText)
    e.reps?.requires?.forEach((r) => add('reason', r.text))
  }
  add('reason', 'Slow down')
  add('praise', 'Good rep')
  const lines: Line[] = [...kinds].map(([text, kind]) => ({ id: lineId(text), text, kind }))
  NUMBER_WORDS.forEach((word, i) => lines.push({ id: `n-${i + 1}`, text: word, kind: 'number' }))
  return lines
}
