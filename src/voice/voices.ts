// The voice options users can pick. Each one is an ElevenLabs voice whose lines are pre-generated
// into public/voice/<key>/ by `npm run voice:generate`. Voice IDs are public identifiers, not secrets.

export type VoiceOption = {
  /** Folder name for its clips, and the saved setting value. */
  key: string
  /** Our own name, shown to users. */
  name: string
  /** One short line for the picker. */
  description: string
  /** ElevenLabs voice ID (from the voice's page). Empty = not generated yet. */
  elevenLabsId: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  // ElevenLabs library voices, chosen by ear in the Test lab (Nov 13): clear, natural, widely used.
  { key: 'arjun', name: 'Arjun', description: 'Indian English, male', elevenLabsId: '2iAXJEMO2o0PqUHzvZwQ' }, // "Ranbir"
  { key: 'meera', name: 'Meera', description: 'Indian English, female', elevenLabsId: 'm7GHBtY0UEqljrKQw2JH' }, // "Aisha"
  { key: 'max', name: 'Max', description: 'American English, male', elevenLabsId: 'UgBBYS2sOqTuMpoF3BR0' }, // "Mark"
  { key: 'ava', name: 'Ava', description: 'American English, female', elevenLabsId: 'OYTbf65OHHFELVut7v2H' }, // "Hope"
]

export const DEFAULT_VOICE = VOICE_OPTIONS[0].key
