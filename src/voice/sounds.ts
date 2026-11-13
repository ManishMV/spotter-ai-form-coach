// Short feedback sounds, generated in code (Web Audio API): no audio files to download.
// Distance-friendly: you know a rep counted (or didn't) without looking at the screen.

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
  } catch {
    ctx = null // no Web Audio support: sounds are simply skipped
  }
}

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

/** A rep counted: bright, rising two-note chime. */
export function playRepSound() {
  tone(880, 0, 0.12)
  tone(1320, 0.08, 0.18)
}

/** A rep didn't count: low, flat double tone. */
export function playNoRepSound() {
  tone(260, 0, 0.14, 0.2)
  tone(220, 0.16, 0.18, 0.2)
}
