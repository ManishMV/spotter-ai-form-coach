// The sound effects Spotter plays (generated with ElevenLabs Sound Effects; see scripts/generate-sounds.ts).
export const SOUND_IDS = ['rep', 'no-rep', 'tick', 'go', 'set-complete'] as const
export type SoundId = (typeof SOUND_IDS)[number]
