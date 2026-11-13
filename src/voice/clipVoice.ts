// Voice that plays pre-recorded ElevenLabs clips (public/voice/<voice>/<line>.mp3), with natural pauses.
// A phrase like "Four. Chest up." is split into parts, each played as its own clip with a short pause
// between them. Any part without a clip (e.g. rep 51, or clips not generated yet) uses browser speech.
import { cancelSpeech, speakOnce } from './browserVoice'
import { lineId } from './lines'
import { audioContext, playClipNode, trimSilence, unlockSounds, type Clip } from './sounds'
import type { SayOptions, Voice } from './types'
import { today } from '../settings'
import { DEFAULT_VOICE, VOICE_OPTIONS } from './voices'

/** Pause between parts of a phrase ("Four." … "Chest up."), in milliseconds. Tunable in the Test lab. */
let pauseMs = 300
export const pauseBetweenParts = () => pauseMs
export function setPauseBetweenParts(ms: number) {
  pauseMs = Math.max(0, Math.min(1000, ms))
}

// The user's voice choice: shared across exercises, kept for the day (like the other settings).
const CHOICE_KEY = 'spotter.voiceChoice.v2'
let choice = DEFAULT_VOICE
try {
  const saved = JSON.parse(localStorage.getItem(CHOICE_KEY) ?? 'null') as { key: string; day: string } | null
  if (saved && saved.day === today() && VOICE_OPTIONS.some((v) => v.key === saved.key)) choice = saved.key
} catch {
  // storage blocked: default voice
}

/** Loaded clips per voice (voice key → line id → clip), so switching or auditioning voices is instant. */
const cache = new Map<string, Map<string, Clip>>()
const loading = new Map<string, Promise<void>>()

// Silence around each clip is trimmed at load (trimSilence in sounds.ts), so the pause between parts is exact.
/** Load (and decode) every clip for a voice, once. Missing clips are fine: those lines fall back. */
function loadClips(voiceKey: string): Promise<void> {
  const ctx = audioContext()
  if (!ctx) return Promise.resolve() // not unlocked yet: try again on the next sound
  const existing = loading.get(voiceKey)
  if (existing) return existing
  const clips = new Map<string, Clip>()
  cache.set(voiceKey, clips)
  const job = (async () => {
    try {
      const res = await fetch(`/voice/${voiceKey}/manifest.json`)
      if (!res.ok) return // not generated yet: everything uses browser speech
      const { lines } = (await res.json()) as { lines: string[] }
      await Promise.all(
        lines.map(async (id) => {
          try {
            const audio = await fetch(`/voice/${voiceKey}/${id}.mp3`)
            if (!audio.ok) return
            clips.set(id, trimSilence(await ctx.decodeAudioData(await audio.arrayBuffer())))
          } catch {
            // one bad clip: that line falls back to browser speech
          }
        }),
      )
    } catch {
      // offline / blocked: browser speech
    }
  })()
  loading.set(voiceKey, job)
  return job
}

// ---- Playback with a single "now playing" chain and at most one waiting phrase.
let token = 0 // bumps on every interrupt, so an old chain stops at its next step
let playing = false
let waiting: { text: string; until: number } | null = null
let current: AudioBufferSourceNode | null = null

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function playClip(clip: Clip): Promise<void> {
  return playClipNode(clip, (src) => (current = src)) // speech only, silence trimmed
}

/** "Four. Chest up." → ["Four", "Chest up"]; keeps commas and dashes inside a part. */
export function splitPhrase(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim().replace(/[.!?]+$/, ''))
    .filter(Boolean)
}

async function playPhrase(text: string, myToken: number, voiceKey = choice) {
  playing = true
  const parts = splitPhrase(text)
  for (let i = 0; i < parts.length; i++) {
    if (myToken !== token) return
    if (i > 0) await wait(pauseMs)
    if (myToken !== token) return
    const clip = cache.get(voiceKey)?.get(lineId(parts[i]))
    await (clip ? playClip(clip) : speakOnce(parts[i]))
  }
  if (myToken !== token) return
  playing = false
  if (waiting) {
    const next = waiting
    waiting = null
    if (Date.now() <= next.until) void playPhrase(next.text, token) // else it went stale: drop it
  }
}

function stopAll() {
  token++
  waiting = null
  playing = false
  try {
    current?.stop()
  } catch {
    // already stopped
  }
  current = null
  cancelSpeech()
}

export const clipVoice: Voice = {
  unlock() {
    unlockSounds()
    void loadClips(choice)
    stopAll()
    void playPhrase('Get ready', token)
  },
  say(text: string, { interrupt, expiresInMs = Infinity }: SayOptions) {
    if (!text) return
    void loadClips(choice) // first sound after unlocking starts loading (no-op once loaded)
    if (interrupt || !playing) {
      stopAll()
      void playPhrase(text, token)
    } else {
      waiting = { text, until: Date.now() + expiresInMs } // newest waiting phrase wins
    }
  },
  isSpeaking: () => playing,
  stop: stopAll,
}

/** The chosen voice option's key. */
export function chosenVoice(): string {
  return choice
}

/** Pick a voice option; kept for the day on this device and loaded straight away. */
export function chooseVoice(key: string) {
  if (!VOICE_OPTIONS.some((v) => v.key === key)) return
  choice = key
  try {
    localStorage.setItem(CHOICE_KEY, JSON.stringify({ key, day: today() }))
  } catch {
    // storage blocked: applies until the page closes
  }
  void loadClips(key)
}

/** How many clips are loaded for the chosen voice (0 = using browser speech). */
export function loadedClipCount(): number {
  return cache.get(choice)?.size ?? 0
}

/**
 * Test lab: say a phrase in any voice (its folder key), without changing the user's choice.
 * Loads that voice's clips first, so the very first play already uses them.
 */
export async function audition(voiceKey: string, text: string) {
  unlockSounds()
  await loadClips(voiceKey)
  stopAll()
  void playPhrase(text, token, voiceKey)
}
