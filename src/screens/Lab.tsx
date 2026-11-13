// Test lab (open with ?lab): hear every voice line and play simulated sets through the real
// counting + coaching code — so voice, wording, timing and coaching rules can be checked
// without exercising. Tracking itself still needs a real person in front of the camera.
import { useEffect, useRef, useState } from 'react'
import { Logo } from '../components/Logo'
import { CoachFeedback } from '../coach/feedback'
import { RepCounter } from '../coach/repCounter'
import { SetTracker, type SetSummary } from '../coach/setTracker'
import { SetEnder } from '../coach/setEnd'
import { Summary } from './Summary'
import { pushup } from '../exercises/pushup'
import { squat } from '../exercises/squat'
import type { Exercise } from '../exercises/types'
import { buildFrames, FRAME_MS, SCENARIOS, type Scenario } from '../lab/simulate'
import type { CoachingMode } from '../settings'
import { voice } from '../voice'
import { announceRep, announceRestLine, resetSpeechPolicy } from '../voice/announce'
import { POSITION } from '../voice/lines'
import { currentVoice, englishVoices, setVoicePrefs } from '../voice/browserVoice'
import { audition, chooseVoice, chosenVoice, loadedClipCount, pauseBetweenParts, setPauseBetweenParts } from '../voice/clipVoice'
import { VOICE_OPTIONS } from '../voice/voices'
import { loadClip, playClipNode, playFallbackSound, playNoRepSound, playRepSound, playSound, unlockSounds } from '../voice/sounds'
import { SOUND_IDS, type SoundId } from '../voice/soundIds'

const EXERCISES: Record<string, Exercise> = { squat, pushup }

/** Voices to compare side by side. The same lines for each. */
const AUDITION_VOICES = VOICE_OPTIONS.map((v) => ({ key: v.key, name: v.name, note: v.description }))
const SOUND_LABELS: Record<SoundId, string> = {
  rep: 'Rep counted',
  'no-rep': 'Rep didn’t count',
  tick: 'Countdown tick',
  go: '“Go”',
  'set-complete': 'Set complete',
}
/** Play a sound-effect variation file (generated into public/sounds/_options). */
async function playVariation(id: SoundId, n: number) {
  ensureUnlocked()
  const clip = await loadClip(`/sounds/_options/${id}-${n}.mp3`)
  if (clip) void playClipNode(clip)
}

const AUDITION_LINES = ['Six. Keep your chest up.', 'Keep your feet side by side.', 'Nice depth.', 'Move back so your whole body is in view.']

/** Every line an exercise can say, grouped for the "Hear the lines" section. */
function linesFor(e: Exercise) {
  const reasons = [e.reps?.partialText, ...(e.reps?.requires ?? []).map((r) => r.text), 'Slow down'].filter(Boolean) as string[]
  return {
    'Form cues': (e.cues ?? []).map((c) => c.text),
    Praise: [...new Set((e.cues ?? []).map((c) => c.praise))],
    "Rep didn't count": [...new Set(reasons)],
  }
}

const PROMPTS = [...Object.values(POSITION), squat.reps!.startText, pushup.reps!.startText]

let unlocked = false
/** First tap anywhere on the lab unlocks sound (phones/browsers require a gesture). */
function ensureUnlocked() {
  if (unlocked) return
  unlockSounds()
  chooseVoice(chosenVoice()) // start loading the chosen voice's clips right away
  unlocked = true
}
const sayNow = (text: string) => {
  ensureUnlocked()
  voice.say(text, { interrupt: true })
}

function Chip({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press min-h-11 border border-line bg-paper px-3 py-2 text-left text-[14px] hover:bg-paper-2">
      {children}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="label mb-3 text-muted">{title}</h2>
      {children}
    </section>
  )
}

type LogLine = { rep: number; counted: boolean; text: string; note?: string }

export function Lab() {
  // ---- Voice picker
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(englishVoices)
  const [current, setCurrent] = useState(currentVoice)
  useEffect(() => {
    const refresh = () => setVoices(englishVoices())
    speechSynthesis.addEventListener?.('voiceschanged', refresh)
    return () => speechSynthesis.removeEventListener?.('voiceschanged', refresh)
  }, [])
  const choose = (patch: { name?: string; rate?: number }) => {
    setVoicePrefs(patch)
    setCurrent(currentVoice())
  }
  // Sound-effect variations exist only during a sound round (npm run sounds:generate).
  const [hasSoundOptions, setHasSoundOptions] = useState(false)
  useEffect(() => {
    fetch('/sounds/_options/manifest.json')
      .then((r) => setHasSoundOptions(r.ok && (r.headers.get('content-type') ?? '').includes('json')))
      .catch(() => setHasSoundOptions(false))
  }, [])
  // Spotter voice options (ElevenLabs clips)
  const [voiceKey, setVoiceKey] = useState(chosenVoice)
  const [clipCount, setClipCount] = useState(loadedClipCount)
  const [pause, setPause] = useState(pauseBetweenParts)
  const pickSpotterVoice = (key: string) => {
    ensureUnlocked()
    chooseVoice(key)
    setVoiceKey(key)
    // Clips load in the background; refresh the count shortly after.
    window.setTimeout(() => setClipCount(loadedClipCount()), 1500)
  }

  // ---- Simulated set
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[1])
  const [mode, setMode] = useState<CoachingMode>('all')
  const [countAloud, setCountAloud] = useState(false)
  const [target, setTarget] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [reps, setReps] = useState(0)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [log, setLog] = useState<LogLine[]>([])
  const [labSummary, setLabSummary] = useState<SetSummary | null>(null)
  const timer = useRef(0)
  const stopSet = () => {
    window.clearInterval(timer.current)
    setRunning(false)
  }
  useEffect(() => () => window.clearInterval(timer.current), [])

  const playSet = () => {
    ensureUnlocked()
    stopSet()
    const exercise = EXERCISES[scenario.exercise]
    const counter = new RepCounter(exercise.reps!)
    const coach = new CoachFeedback(exercise.cues, mode)
    const tracker = new SetTracker(exercise.cues, target, exercise.reps?.metric ?? null)
    tracker.start()
    resetSpeechPolicy()
    const frames = buildFrames(scenario)
    let i = 0
    let t = 0
    let lastNote = ''
    const ender = new SetEnder(target, 0) // runs on the simulated clock, like a real set
    let lastPhase = counter.phase
    const end = () => {
      stopSet()
      setLabSummary(tracker.summary()) // the set is over: show the real summary screen
    }
    setReps(0)
    setLog([])
    setMessage('')
    setLabSummary(null)
    setRunning(true)
    timer.current = window.setInterval(() => {
      const frame = frames[i++]
      if (!frame) return end()
      if (frame.note) {
        lastNote = frame.note
        setNote(frame.note)
      }
      t += FRAME_MS
      const rep = counter.update(frame.angles, t)
      if (rep || (counter.phase === 'down' && lastPhase !== 'down')) ender.onActivity(t)
      lastPhase = counter.phase
      const event = ender.tick(t, counter.phase === 'down')
      if (event?.type === 'rest') {
        if (announceRestLine(event.text)) setMessage(event.text)
      } else if (event?.type === 'say') {
        if (event.tick) playSound('tick')
        voice.say(event.text, { interrupt: true })
        setMessage(event.text)
      } else if (event?.type === 'end') return end()
      if (!rep) return
      tracker.onRep(rep)
      const feedback = coach.next(rep)
      if (feedback?.tone === 'fix') tracker.onCue(feedback.text)
      const isFinal = rep.counted && ender.reachedTarget(rep.number)
      announceRep(rep, feedback, countAloud, isFinal) // exactly what the workout screen does
      setReps(rep.number)
      const text = rep.counted ? (feedback?.text ?? '') : (rep.failed?.text ?? '')
      setMessage(text)
      setLog((prev) => [...prev, { rep: rep.number, counted: rep.counted, text, note: lastNote }])
      if (isFinal) end()
    }, FRAME_MS)
  }

  const countdown = () => {
    sayNow('Get in position')
    ;['3', '2', '1', 'Go'].forEach((n, k) =>
      window.setTimeout(() => {
        playSound(n === 'Go' ? 'go' : 'tick') // same as the workout screen
        voice.say(n, { interrupt: true })
      }, 2000 + k * 1000),
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[880px] px-4 pb-24 sm:px-8">
      <header className="flex h-16 items-center justify-between border-b border-line">
        <Logo />
        <span className="label text-accent">Test lab</span>
      </header>

      <p className="mt-8 max-w-[60ch] text-[15px] leading-relaxed text-pretty text-muted">
        Hear every voice line and play simulated sets through the real counting and coaching code, without
        exercising. Tracking accuracy still needs a real workout in front of the camera.
      </p>

      <Section title="Sounds: compare">
        <p className="mb-3 max-w-[70ch] text-[14px] text-pretty text-muted">
          “In use” plays what the app uses now (the countdown tick is an ElevenLabs sound; the rest are built-in
          tones, which tested better as short, frequent feedback). New variations appear here after
          <code> npm run sounds:generate</code>.
        </p>
        <div className="grid gap-px border border-line bg-line">
          {SOUND_IDS.map((id) => (
            <div key={id} className="grid gap-3 bg-paper p-4 sm:grid-cols-[170px_1fr] sm:items-center">
              <p className="text-[15px]">{SOUND_LABELS[id]}</p>
              <div className="flex flex-wrap gap-2">
                <Chip onClick={() => (ensureUnlocked(), playFallbackSound(id))}>Built-in</Chip>
                {hasSoundOptions &&
                  [1, 2, 3].map((n) => <Chip key={n} onClick={() => void playVariation(id, n)}>{`Option ${n}`}</Chip>)}
                <Chip onClick={() => (ensureUnlocked(), playSound(id))}>In use</Chip>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Audition: compare voices">
        <div className="grid gap-px border border-line bg-line">
          {AUDITION_VOICES.map((v) => (
            <div key={v.key} className="grid gap-3 bg-paper p-4 sm:grid-cols-[150px_1fr] sm:items-center">
              <div>
                <p className="text-[16px]">{v.name}</p>
                <p className="text-[13px] text-muted">{v.note}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {AUDITION_LINES.map((line) => (
                  <Chip key={line} onClick={() => (ensureUnlocked(), void audition(v.key, line))}>
                    {line}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-muted">Same lines in every voice. The pause slider below applies here too.</p>
      </Section>

      <Section title="Spotter voice">
        <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
          {VOICE_OPTIONS.map((v) => (
            <button
              key={v.key}
              onClick={() => pickSpotterVoice(v.key)}
              className={`press flex min-h-16 flex-col items-start justify-center px-4 py-3 text-left ${voiceKey === v.key ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper-2'}`}
            >
              <span className="text-[16px]">{v.name}</span>
              <span className={`text-[13px] ${voiceKey === v.key ? 'text-paper/70' : 'text-muted'}`}>
                {v.description} · {v.elevenLabsId ? 'ElevenLabs' : 'not generated yet'}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 border border-line p-4 text-[14px]">
          <label className="flex flex-1 items-center gap-3">
            <span className="shrink-0">Pause between number and cue: {pause} ms</span>
            <input
              type="range"
              min={0}
              max={800}
              step={50}
              value={pause}
              onChange={(e) => {
                setPauseBetweenParts(Number(e.target.value))
                setPause(Number(e.target.value))
              }}
              className="flex-1"
            />
          </label>
          <Chip onClick={() => sayNow('Six. Keep your chest up.')}>Hear “Six. Keep your chest up.”</Chip>
        </div>
        <p className="mt-2 text-[13px] text-muted">
          {clipCount > 0
            ? `${clipCount} clips loaded for this voice.`
            : 'No clips for this voice yet: lines use the fallback voice below, with natural pauses.'}
        </p>
      </Section>

      <Section title="Fallback voice (browser speech)">
        <div className="grid gap-4 border border-line p-4 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-2 text-[14px]">
            Voice
            <select
              value={current.name ?? ''}
              onChange={(e) => choose({ name: e.target.value })}
              className="h-11 border border-line bg-paper px-2"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-[14px]">
            Speed: {current.rate.toFixed(2)}×
            <input type="range" min={0.8} max={1.3} step={0.05} value={current.rate} onChange={(e) => choose({ rate: Number(e.target.value) })} />
          </label>
          <div className="sm:col-span-2">
            <Chip onClick={() => sayNow('Four. Keep your chest up.')}>Try it: “Four. Keep your chest up.”</Chip>
          </div>
        </div>
        <p className="mt-2 text-[13px] text-muted">Your pick is saved on this device and used in workouts too.</p>
      </Section>

      <Section title="Start and sounds">
        <div className="flex flex-wrap gap-2">
          <Chip onClick={() => sayNow('Get ready')}>“Get ready” (Start tap)</Chip>
          <Chip onClick={countdown}>Countdown</Chip>
          <Chip onClick={() => (ensureUnlocked(), playRepSound())}>Rep counted sound</Chip>
          <Chip onClick={() => (ensureUnlocked(), playNoRepSound())}>Rep didn’t count sound</Chip>
          <Chip onClick={() => (ensureUnlocked(), playRepSound(), voice.say('Four', { interrupt: true }))}>Counted rep: chime + “Four”</Chip>
        </div>
      </Section>

      <Section title="Where to stand">
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <Chip key={p} onClick={() => sayNow(p)}>
              {p}
            </Chip>
          ))}
        </div>
      </Section>

      {Object.values(EXERCISES).map((e) => (
        <Section key={e.id} title={`${e.name}: every line`}>
          <div className="grid gap-4">
            {Object.entries(linesFor(e)).map(([group, lines]) => (
              <div key={group}>
                <p className="mb-2 text-[13px] text-muted">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {lines.map((l) => (
                    <Chip key={l} onClick={() => sayNow(l)}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ))}

      <Section title="Simulated set">
        <div className="grid gap-4 border border-line p-4">
          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s)}
                className={`press min-h-11 border px-3 py-2 text-[14px] ${scenario.id === s.id ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:bg-paper-2'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[14px]">
            <span className="text-muted">Coaching:</span>
            {(['all', 'safety', 'off'] as CoachingMode[]).map((m) => (
              <label key={m} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                {m === 'all' ? 'All cues' : m === 'safety' ? 'Safety only' : 'Off'}
              </label>
            ))}
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" checked={countAloud} onChange={(e) => setCountAloud(e.target.checked)} />
              Count reps out loud
            </label>
            <label className="flex min-h-11 items-center gap-2">
              Rep target
              <select
                value={target ?? ''}
                onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : null)}
                className="h-9 border border-line bg-paper px-2"
              >
                <option value="">None</option>
                {[3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <button
              onClick={running ? stopSet : playSet}
              className="press h-12 bg-accent px-6 font-medium text-accent-ink hover:brightness-105"
            >
              {running ? 'Stop' : 'Play set'}
            </button>
          </div>

          {/* What the workout screen would show */}
          <div className="grid gap-4 bg-black p-5 text-white sm:grid-cols-[auto_1fr]">
            <div>
              <p className="label text-white/60">Reps</p>
              <p className="text-[96px] leading-none font-semibold tracking-[-0.05em] tabular-nums">{reps}</p>
            </div>
            <div className="self-center">
              <p className="label text-white/50">Now: {note || '—'}</p>
              <p className="mt-2 text-[28px] leading-tight font-medium">{message || ' '}</p>
            </div>
          </div>

          {labSummary && (
            <div className="border border-line bg-paper py-2">
              <p className="label px-4 pt-2 text-muted sm:px-8">Summary screen preview</p>
              <Summary
                exercise={EXERCISES[scenario.exercise]}
                summary={labSummary}
                onAgain={playSet}
                onDone={() => setLabSummary(null)}
                embedded
              />
            </div>
          )}

          {log.length > 0 && (
            <ol className="grid gap-1 text-[14px]">
              {log.map((l, i) => (
                <li key={i} className="flex gap-3 border-b border-line py-1.5">
                  <span className={`w-28 shrink-0 ${l.counted ? 'text-ink' : 'text-accent'}`}>{l.counted ? `Rep ${l.rep} counted` : 'Didn’t count'}</span>
                  <span className="flex-1">{l.text || <span className="text-faint">(quiet)</span>}</span>
                  <span className="hidden text-muted sm:block">{l.note}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Section>
    </div>
  )
}
