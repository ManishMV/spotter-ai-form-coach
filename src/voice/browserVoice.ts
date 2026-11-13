// Voice using the browser's built-in speech (Web Speech API): free, offline, no downloads.
import type { SayOptions, Voice } from './types'

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
let chosen: SpeechSynthesisVoice | null = null

// Voice name and speed picked in the Test lab, remembered on this device.
const PREFS_KEY = 'spotter.voice.v1'
type VoicePrefs = { name?: string; rate: number }
let prefs: VoicePrefs = { rate: 1.05 }
try {
  prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }
} catch {
  // storage blocked: defaults
}
let waiting: string | null = null // the one line queued behind the current one

/** Prefer a natural-sounding English voice; fall back to the first English one. */
function pickVoice() {
  const voices = synth?.getVoices() ?? []
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  const preferred = ['Google UK English Female', 'Google US English', 'Samantha', 'Microsoft Aria', 'Microsoft Jenny', 'Karen', 'Daniel']
  const picked = prefs.name ? voices.find((v) => v.name === prefs.name) : undefined
  chosen = picked ?? preferred.map((name) => english.find((v) => v.name.includes(name))).find(Boolean) ?? english[0] ?? null
}

/** English voices this browser offers (for the Test lab picker). */
export function englishVoices(): SpeechSynthesisVoice[] {
  return (synth?.getVoices() ?? []).filter((v) => v.lang.toLowerCase().startsWith('en'))
}

/** The voice and speed in use. */
export function currentVoice() {
  return { name: chosen?.name ?? null, rate: prefs.rate }
}

/** Change voice and/or speed; remembered on this device and used by the app too. */
export function setVoicePrefs(patch: Partial<VoicePrefs>) {
  prefs = { ...prefs, ...patch }
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // storage blocked: applies until the page closes
  }
  pickVoice()
}
// Voices load asynchronously in most browsers.
if (synth) {
  pickVoice()
  synth.addEventListener?.('voiceschanged', pickVoice)
}

function speakNow(text: string) {
  if (!synth) return
  const line = new SpeechSynthesisUtterance(text)
  if (chosen) line.voice = chosen
  line.lang = chosen?.lang ?? 'en-GB'
  line.rate = prefs.rate
  line.onend = () => {
    if (waiting && !synth.speaking) {
      const next = waiting
      waiting = null
      speakNow(next)
    }
  }
  synth.speak(line)
}

/** Say one line and resolve when it's finished (used by the clip voice for lines without a clip). */
export function speakOnce(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!synth || !text) return resolve()
    const line = new SpeechSynthesisUtterance(text)
    if (chosen) line.voice = chosen
    line.lang = chosen?.lang ?? 'en-GB'
    line.rate = prefs.rate
    line.onend = () => resolve()
    line.onerror = () => resolve()
    synth.speak(line)
  })
}

/** Stop browser speech immediately. */
export function cancelSpeech() {
  synth?.cancel()
}

export const browserVoice: Voice = {
  unlock() {
    if (!synth) return
    synth.cancel()
    speakNow('Get ready') // spoken inside the tap, which unlocks speech on iPhone
  },
  say(text: string, { interrupt }: SayOptions) {
    if (!synth || !text) return
    if (interrupt || !synth.speaking) {
      waiting = null
      synth.cancel() // never talk over ourselves
      speakNow(text)
    } else {
      waiting = text // newest waiting line wins
    }
  },
  stop() {
    waiting = null
    synth?.cancel()
  },
}
