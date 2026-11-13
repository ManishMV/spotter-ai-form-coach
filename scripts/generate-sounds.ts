// Generates Spotter's sound effects with ElevenLabs Sound Effects (text → sound), once, shipped with the app.
//
//   npm run sounds:generate                  3 variations of each sound → public/sounds/_options/<id>-<n>.mp3
//   npm run sounds:generate -- --only rep    just one sound
//   npm run sounds:generate -- --pick rep=2 no-rep=1 ...   copy the chosen variation to public/sounds/<id>.mp3
//
// Needs ELEVENLABS_API_KEY in .env.local (git-ignored, with Sound Effects access). The key is never printed.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SOUND_IDS, type SoundId } from '../src/voice/soundIds'

/** What each sound should feel like. Short, clean, gym-friendly, never harsh. */
const SOUNDS: Record<SoundId, { prompt: string; seconds: number }> = {
  // Very short durations came out near-silent, so these ask for 1 s (silence is trimmed when played).
  rep: {
    prompt: 'A clearly audible, bright, satisfying two-note success chime, like a premium fitness app confirming a completed rep. Clean bell-like tone, modern, short.',
    seconds: 1,
  },
  'no-rep': {
    prompt: 'A clearly audible, soft, low two-note descending tone meaning "not quite", like a friendly app notification. Warm and gentle, clearly different from a success chime, not harsh, no buzzer.',
    seconds: 1,
  },
  tick: {
    prompt: 'A clearly audible single crisp wooden click, like a modern metronome tick or a stopwatch tick. One click only, dry, no echo.',
    seconds: 1,
  },
  go: {
    prompt: 'A short energetic start signal: a crisp rising tone ending in a bright ding, like the start of a workout timer. Clean, no voice.',
    seconds: 0.8,
  },
  'set-complete': {
    prompt: 'A short uplifting success flourish for finishing a workout set: three quick ascending soft chimes, celebratory but subtle and modern.',
    seconds: 1.5,
  },
}

const VARIATIONS = 3
const args = process.argv.slice(2)
const only = args.includes('--only') ? (args[args.indexOf('--only') + 1] as SoundId) : null
const picks = args.includes('--pick') ? args.slice(args.indexOf('--pick') + 1).filter((a) => a.includes('=')) : null

function readKey(): string {
  const line = existsSync('.env.local')
    ? readFileSync('.env.local', 'utf8').split(/\r?\n/).find((l) => l.startsWith('ELEVENLABS_API_KEY='))
    : undefined
  const key = process.env.ELEVENLABS_API_KEY ?? line?.slice('ELEVENLABS_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
  if (!key) throw new Error('No ELEVENLABS_API_KEY found (add it to .env.local).')
  return key
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function generate(key: string, prompt: string, seconds: number): Promise<Buffer> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: prompt, duration_seconds: seconds, prompt_influence: 0.6 }),
    })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * attempt)
      continue
    }
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  throw new Error('ElevenLabs: too many retries')
}

async function main() {
  if (picks) {
    // Copy the chosen variations into place: public/sounds/<id>.mp3
    for (const pick of picks) {
      const [id, n] = pick.split('=')
      const from = join('public', 'sounds', '_options', `${id}-${n}.mp3`)
      if (!existsSync(from)) throw new Error(`Missing ${from}`)
      copyFileSync(from, join('public', 'sounds', `${id}.mp3`))
      console.log(`${id}: using variation ${n}`)
    }
    return
  }
  const key = readKey()
  const dir = join('public', 'sounds', '_options')
  mkdirSync(dir, { recursive: true })
  for (const id of SOUND_IDS.filter((s) => !only || s === only)) {
    const { prompt, seconds } = SOUNDS[id]
    for (let n = 1; n <= VARIATIONS; n++) {
      writeFileSync(join(dir, `${id}-${n}.mp3`), await generate(key, prompt, seconds))
      await sleep(300)
    }
    console.log(`${id}: ${VARIATIONS} variations`)
  }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ sounds: SOUND_IDS, variations: VARIATIONS }, null, 2))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
