// How each kind of line is delivered when generating clips. Compared by ear in the Test lab.
//   A = original: steady settings, plain text
//   B = expressive settings + coach phrasing ("Chest up!", commas where a coach would breathe)
//   C = Eleven v3 + tone tags ("[firm] Chest up!")
//   D = Eleven v4 + tone tags
import type { Line, LineKind } from '../src/voice/lines'

export type Delivery = {
  model: string
  settings?: Record<string, number | boolean>
  /** The exact text sent for a line. */
  text: (line: Line) => string
}

/** Coach phrasing: punchy commands and praise, calm explanations, a breath before a reason. */
function phrase(line: Line): string {
  const t = line.text.replace(' — ', ', ')
  const ending: Record<LineKind, string> = { number: '.', start: '!', prompt: '.', cue: '!', praise: '!', reason: '.' }
  return line.id === 'get-ready' || line.id === 'get-in-position' ? `${t}.` : `${t}${ending[line.kind]}`
}

/** Tone tags (Eleven v3/v4): a short delivery hint per kind of line. */
const TAG: Record<LineKind, string> = {
  number: '[crisp]',
  start: '[energetic]',
  prompt: '[friendly]',
  cue: '[firm, encouraging]',
  praise: '[warmly]',
  reason: '[calmly]',
}

export const DELIVERIES: Record<string, Delivery> = {
  A: {
    model: 'eleven_multilingual_v2',
    settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
    text: (l) => `${l.text}.`,
  },
  B: {
    model: 'eleven_multilingual_v2',
    settings: { stability: 0.3, similarity_boost: 0.8, style: 0.55, use_speaker_boost: true },
    text: phrase,
  },
  C: { model: 'eleven_v3', settings: { stability: 0.5 }, text: (l) => `${TAG[l.kind]} ${phrase(l)}` },
  D: { model: 'eleven_v4', text: (l) => `${TAG[l.kind]} ${phrase(l)}` },
}
