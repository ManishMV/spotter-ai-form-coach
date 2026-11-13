// Feedback sounds, distance-friendly: you know what happened without looking at the screen.
// Plays ElevenLabs sound-effect clips from public/sounds/<id>.mp3 when present; otherwise falls back to
// simple tones generated in code (Web Audio API), so there's always a sound.
import { SOUND_IDS, type SoundId } from './soundIds'

let ctx: AudioContext | null = null

/** The shared audio context (null until unlocked), also used to play voice clips. */
export function audioContext(): AudioContext | null {
  return ctx
}

/** Call inside a tap handler: browsers only allow sound after a user gesture. */
export function unlockSounds() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    void loadSoundClips()
  } catch {
    ctx = null // no Web Audio support: sounds are simply skipped
  }
}

/** A decoded clip plus where its sound actually starts and ends (silence trimmed). */
export type Clip = { buffer: AudioBuffer; start: number; end: number; gain?: number }

/** Sound effects are levelled to this peak so none is too quiet or louder than the coach's voice. */
const SOUND_PEAK = 0.6

function levelled(clip: Clip): Clip {
  const data = clip.buffer.getChannelData(0)
  let peak = 0
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
  return peak > 0 ? { ...clip, gain: Math.min(SOUND_PEAK / peak, 8) } : clip
}

/**
 * Generated clips carry silence before and after the sound. Trim it (with a small cushion so soft
 * endings aren't cut), so sounds land exactly when the event happens.
 */
export function trimSilence(buffer: AudioBuffer, threshold = 0.02): Clip {
  const data = buffer.getChannelData(0)
  const rate = buffer.sampleRate
  let a = 0
  while (a < data.length && Math.abs(data[a]) < threshold) a++
  let b = data.length - 1
  while (b > a && Math.abs(data[b]) < threshold) b--
  const start = Math.max(0, a / rate - 0.02)
  const end = Math.min(buffer.duration, b / rate + 0.08)
  return end > start ? { buffer, start, end } : { buffer, start: 0, end: buffer.duration }
}

/** Play a clip (speech or sound) through the shared context; resolves when it ends. */
export function playClipNode(clip: Clip, onStart?: (src: AudioBufferSourceNode) => void): Promise<void> {
  if (!ctx) return Promise.resolve()
  const c = ctx
  return new Promise((resolve) => {
    const src = c.createBufferSource()
    src.buffer = clip.buffer
    if (clip.gain && clip.gain !== 1) {
      const g = c.createGain()
      g.gain.value = clip.gain
      src.connect(g).connect(c.destination)
    } else {
      src.connect(c.destination)
    }
    src.onended = () => resolve()
    onStart?.(src)
    src.start(0, clip.start, clip.end - clip.start)
  })
}

/** Fetch + decode + trim + level a sound-effect file, or null if it's missing. */
export async function loadClip(path: string): Promise<Clip | null> {
  if (!ctx) return null
  try {
    const res = await fetch(path)
    if (!res.ok || !res.headers.get('content-type')?.includes('audio')) return null
    return levelled(trimSilence(await ctx.decodeAudioData(await res.arrayBuffer()), 0.01))
  } catch {
    return null
  }
}

// ---- Sound-effect clips (ElevenLabs), loaded once after unlocking
const soundClips = new Map<SoundId, Clip>()
let soundsLoading: Promise<void> | null = null
function loadSoundClips() {
  soundsLoading ??= Promise.all(
    SOUND_IDS.map(async (id) => {
      const clip = await loadClip(`/sounds/${id}.mp3`)
      if (clip) soundClips.set(id, clip)
    }),
  ).then(() => undefined)
  return soundsLoading
}

// ---- Built-in fallback tones
/** One soft tone: frequency (Hz), start offset and length (s). */
function tone(freq: number, at: number, length: number, volume = 0.18) {
  if (!ctx) return
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, t)
  // Quick fade in/out so it doesn't click.
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

const FALLBACK: Record<SoundId, () => void> = {
  rep: () => (tone(880, 0, 0.12), tone(1320, 0.08, 0.18)), // bright, rising two-note chime
  'no-rep': () => (tone(260, 0, 0.14, 0.2), tone(220, 0.16, 0.18, 0.2)), // low, flat double tone
  tick: () => tone(1000, 0, 0.05, 0.12),
  go: () => (tone(660, 0, 0.1), tone(990, 0.09, 0.22)),
  'set-complete': () => (tone(660, 0, 0.14), tone(880, 0.12, 0.14), tone(1320, 0.24, 0.3)),
}

/** Play a feedback sound: the ElevenLabs clip if loaded, else the built-in tone. */
export function playSound(id: SoundId) {
  const clip = soundClips.get(id)
  if (clip) void playClipNode(clip)
  else FALLBACK[id]()
}

/** Built-in tone only (for comparison in the Test lab). */
export function playFallbackSound(id: SoundId) {
  FALLBACK[id]()
}

/** A rep counted. */
export const playRepSound = () => playSound('rep')
/** A rep didn't count. */
export const playNoRepSound = () => playSound('no-rep')
