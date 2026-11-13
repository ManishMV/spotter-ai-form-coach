// Generates Spotter's voice clips with ElevenLabs: one MP3 per line, per voice option.
// Run once (or after changing lines/voices); the clips ship with the app, so there are no API calls at runtime.
//
//   npm run voice:generate              generate missing clips for every voice that has an ID
//   npm run voice:generate -- --dry     list lines and character count, no API calls
//   npm run voice:generate -- --voice atlas --force   regenerate one voice
//   npm run voice:generate -- --key ranbir --id <voiceId> --lines n-6,chest-up   audition a few lines
//     of any ElevenLabs voice (the clips are reused if that voice is picked later)
//   --delivery A|B|C|D   delivery style (see scripts/delivery.ts); default: DEFAULT_DELIVERY
//
// Needs ELEVENLABS_API_KEY in .env.local (git-ignored). The key is never printed.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { allLines } from '../src/voice/lines'
import { VOICE_OPTIONS } from '../src/voice/voices'
import { DELIVERIES } from './delivery'

/** The delivery style used for the clips that ship with the app. */
export const DEFAULT_DELIVERY = 'D' // Eleven v4 + tone tags, chosen by ear in the Test lab (Nov 13)

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const force = args.includes('--force')
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)
const only = arg('--voice')
const adHoc = arg('--key') && arg('--id') ? { key: arg('--key')!, name: arg('--key')!, elevenLabsId: arg('--id')! } : null
const onlyLines = arg('--lines')?.split(',') ?? null

const deliveryName = arg('--delivery') ?? DEFAULT_DELIVERY
const delivery = DELIVERIES[deliveryName]
if (!delivery) throw new Error(`Unknown delivery "${deliveryName}" (use ${Object.keys(DELIVERIES).join(', ')})`)

function readKey(): string | undefined {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY
  if (!existsSync('.env.local')) return undefined
  const line = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('ELEVENLABS_API_KEY='))
  return line?.slice('ELEVENLABS_API_KEY='.length).trim().replace(/^["']|["']$/g, '')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function tts(key: string, voiceId: string, text: string): Promise<Buffer> {
  const body: Record<string, unknown> = { text, model_id: delivery.model }
  if (delivery.settings) body.voice_settings = delivery.settings
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    })
    if (res.ok) return Buffer.from(await res.arrayBuffer())
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * attempt) // rate limit / server busy: back off and retry
      continue
    }
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  throw new Error('ElevenLabs: too many retries')
}

async function main() {
  const linesFor = (name?: string) => allLines(name).filter((l) => !onlyLines || onlyLines.includes(l.id))
  const lines = linesFor()
  const chars = lines.reduce((n, l) => n + delivery.text(l).length, 0)
  const voices = adHoc ? [adHoc] : VOICE_OPTIONS.filter((v) => (!only || v.key === only) && v.elevenLabsId)
  console.log(`${lines.length} lines, ${chars} characters per voice, delivery ${deliveryName} (${delivery.model}).`)
  if (dry) {
    lines.forEach((l) => console.log(`  ${l.id.padEnd(40)} ${delivery.text(l)}`))
    console.log(`Voices with an ID: ${voices.map((v) => v.name).join(', ') || 'none yet'}`)
    return
  }
  const key = readKey()
  if (!key) throw new Error('No ELEVENLABS_API_KEY found (add it to .env.local).')
  if (voices.length === 0) throw new Error('No voice has an ElevenLabs ID yet (src/voice/voices.ts).')

  for (const voice of voices) {
    const dir = join('public', 'voice', voice.key)
    mkdirSync(dir, { recursive: true })
    let made = 0
    for (const line of linesFor(adHoc ? undefined : voice.name)) {
      const file = join(dir, `${line.id}.mp3`)
      if (existsSync(file) && !force) continue
      writeFileSync(file, await tts(key, voice.elevenLabsId, delivery.text(line)))
      made++
      process.stdout.write(`\r${voice.name}: ${made} new clips`)
      await sleep(250) // be gentle with the API
    }
    // The manifest lists every clip present, so partial audition sets work too.
    const present = allLines(adHoc ? undefined : voice.name).filter((l) => existsSync(join(dir, `${l.id}.mp3`))).map((l) => l.id)
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ voice: voice.key, lines: present }, null, 2))
    console.log(`
${voice.name}: ${made} new clips, ${present.length} in folder.`)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
