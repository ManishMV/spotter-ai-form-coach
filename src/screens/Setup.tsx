// Setup: show where to place the phone or laptop, then one big Start button.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { createPortal } from 'react-dom'
import { Logo } from '../components/Logo'
import { TesterFeedbackButton } from '../components/TesterFeedback'
import { detectDevice, type Device } from '../device'
import { SetupIllustration } from '../components/SetupIllustration'
import { ExerciseDemo } from '../components/ExerciseDemo'
import type { Exercise } from '../exercises'
import { TARGET_OPTIONS, type CoachingMode, type Settings } from '../settings'
import { voice } from '../voice'
import { audition, chooseVoice, chosenVoice } from '../voice/clipVoice'
import { introLine } from '../voice/lines'
import { VOICE_OPTIONS } from '../voice/voices'
import { unlockSounds } from '../voice/sounds'

/** The first tip: where to put the device, for this exercise. */
function placementTip(device: Device, height: Exercise['camera']['height']) {
  if (device === 'laptop') return height === 'floor' ? 'Laptop on the floor, screen tilted back' : 'Laptop at about hip height, on a table or shelf'
  // Lying down, the body is wide: a sideways (landscape) phone fits it from closer, so less floor space.
  // Standing, the body is tall: an upright (portrait) phone fits it from closer.
  return height === 'floor' ? 'Phone on the floor, turned sideways' : 'Phone upright at hip height, propped up'
}

const COACHING: { mode: CoachingMode; label: string; detail: string }[] = [
  { mode: 'all', label: 'All cues', detail: 'Form tips, safety warnings and encouragement.' },
  { mode: 'safety', label: 'Safety only', detail: 'Only warnings that help prevent injury.' },
  { mode: 'off', label: 'Off', detail: 'Just counting your reps.' },
]

/** One on/off row in the options box. */
function SwitchRow({ label, hint, on, onToggle }: { label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="press flex min-h-14 w-full items-center justify-between gap-4 border-t border-line px-4 py-3 text-left"
    >
      <span>
        <span className="text-[15px]">{label}</span>
        <span className="block text-[13px] text-pretty text-muted">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={`flex h-6 w-10 shrink-0 items-center border px-0.5 transition-colors duration-150 ${on ? 'justify-end border-accent bg-accent' : 'justify-start border-line bg-paper-2'}`}
      >
        <span className={`size-4 ${on ? 'bg-accent-ink' : 'bg-faint'}`} />
      </span>
    </button>
  )
}

export function Setup({
  exercise,
  settings,
  onSettings,
  onStart,
  onBack,
}: {
  exercise: Exercise
  settings: Settings
  onSettings: (patch: Partial<Settings>) => void
  onStart: () => void
  onBack: () => void
}) {
  // Guessed automatically; the user can switch if we got it wrong.
  const [device, setDevice] = useState<Device>(detectDevice)
  const other: Device = device === 'laptop' ? 'phone' : 'laptop'
  const tips = [placementTip(device, exercise.camera.height), ...exercise.tips]
  const [voiceKey, setVoiceKey] = useState(chosenVoice)
  const [checking, setChecking] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreSummary = [
    COACHING.find((c) => c.mode === settings.coaching)?.label,
    settings.countAloud ? 'Count out loud' : null,
    settings.showDetails ? 'Details shown' : 'Details hidden',
  ]
    .filter(Boolean)
    .join(' · ')
  const pickVoice = (key: string) => {
    chooseVoice(key)
    setVoiceKey(key)
    const name = VOICE_OPTIONS.find((v) => v.key === key)?.name ?? key
    void audition(key, introLine(name)) // the coach introduces themselves (the tap also unlocks sound)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col px-4 sm:px-8">
      <header className="flex h-16 items-center justify-between border-b border-line">
        <Logo onHome={onBack} />
        <div className="flex items-center gap-1">
          <TesterFeedbackButton />
          <button onClick={onBack} className="label press -mr-3 h-11 px-3 text-muted hover:text-ink">
            ← Back
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col py-8 sm:py-12">
        <p className="label text-accent">{exercise.name}</p>
        <h1 className="mt-3 text-[32px] leading-[1.1] tracking-[-0.03em] text-balance sm:text-[44px]">Set up your {device}</h1>
        <button
          onClick={() => setDevice(other)}
          className="label press -ml-1 mt-3 h-11 self-start px-1 text-muted underline decoration-line underline-offset-4 hover:text-ink"
        >
          Using a {other} instead?
        </button>

        <div className="dot-grid mt-5 border border-line p-4 sm:p-6">
          <SetupIllustration camera={exercise.camera} exercise={exercise.id} device={device} />
        </div>

        <ul className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2">
          {tips.map((tip, i) => (
            <li key={tip} className="flex items-baseline gap-3 bg-paper px-4 py-3 sm:block sm:p-4">
              <span className="label text-faint">0{i + 1}</span>
              <p className="text-[15px] leading-snug text-pretty sm:mt-2">{tip}</p>
            </li>
          ))}
        </ul>

        {/* What a good rep looks like, before starting. */}
        <section aria-label="A good rep" className="mt-6 border border-line">
          <p className="label border-b border-line px-4 py-3 text-muted">A good rep</p>
          <div className="dot-grid px-4 pt-4 pb-3">
            <ExerciseDemo exercise={exercise.id} />
          </div>
        </section>

        {/* Options: set here, because mid-set the device is out of reach. */}
        <section aria-label="Options" className="mt-6 border border-line">
          <div className="border-b border-line p-4">
            <p className="label text-muted" id="target-label">
              Rep target
            </p>
            <div role="radiogroup" aria-labelledby="target-label" className="mt-3 grid grid-cols-5 gap-px border border-line bg-line">
              {TARGET_OPTIONS.map((target) => {
                const on = settings.targetReps === target
                return (
                  <button
                    key={target ?? 'none'}
                    role="radio"
                    aria-checked={on}
                    onClick={() => onSettings({ targetReps: target })}
                    className={`press h-11 text-[14px] tabular-nums ${on ? 'bg-ink text-paper' : 'bg-paper text-muted hover:text-ink'}`}
                  >
                    {target ?? 'None'}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[13px] text-pretty text-muted">
              {settings.targetReps
                ? `The set finishes by itself after ${settings.targetReps} good reps, or when you tap End.`
                : 'No target: the set finishes when you tap End or stop for a few seconds.'}
            </p>
          </div>
          <div className="p-4">
            <p className="label text-muted" id="voice-label">
              Coach voice
            </p>
            <div role="radiogroup" aria-labelledby="voice-label" className="mt-3 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
              {VOICE_OPTIONS.map((v) => {
                const on = voiceKey === v.key
                return (
                  <button
                    key={v.key}
                    role="radio"
                    aria-checked={on}
                    onClick={() => pickVoice(v.key)}
                    className={`press flex min-h-14 flex-col items-start justify-center px-3 py-2 text-left ${on ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper-2'}`}
                  >
                    <span className="text-[15px]">{v.name}</span>
                    <span className={`text-[12px] ${on ? 'text-paper/70' : 'text-muted'}`}>{v.description}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-[13px] text-muted">Tap a voice to meet your coach.</p>
          </div>
          {/* Less-used options, folded away so Start stays close. */}
          <button
            aria-expanded={moreOpen}
            aria-controls="more-options"
            onClick={() => setMoreOpen((o) => !o)}
            className="press flex min-h-14 w-full items-center justify-between gap-4 border-t border-line px-4 py-3 text-left"
          >
            <span>
              <span className="text-[15px]">More options</span>
              <span className="block text-[13px] text-pretty text-muted">{moreSummary}</span>
            </span>
            <span aria-hidden="true" className={`text-muted transition-transform duration-150 ${moreOpen ? 'rotate-180' : ''}`}>
              ⌄
            </span>
          </button>
          {moreOpen && (
            <div id="more-options">
            <div className="border-t border-line p-4">
              <p className="label text-muted" id="coaching-label">
                Coaching
              </p>
              <div role="radiogroup" aria-labelledby="coaching-label" className="mt-3 grid grid-cols-3 gap-px border border-line bg-line">
                {COACHING.map(({ mode, label }) => {
                  const on = settings.coaching === mode
                  return (
                    <button
                      key={mode}
                      role="radio"
                      aria-checked={on}
                      onClick={() => onSettings({ coaching: mode })}
                      className={`press h-11 text-[14px] ${on ? 'bg-ink text-paper' : 'bg-paper text-muted hover:text-ink'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[13px] text-pretty text-muted">
                {COACHING.find((c) => c.mode === settings.coaching)?.detail} We'll always say why a rep didn't count.
              </p>
            </div>
            <SwitchRow
              label="Count reps out loud"
              hint="Hear each rep number, handy when you're away from the screen"
              on={settings.countAloud}
              onToggle={() => onSettings({ countAloud: !settings.countAloud })}
            />
            <SwitchRow
              label="Show details"
              hint="Live joint angles on screen. You can also open or close them during a set"
              on={settings.showDetails}
              onToggle={() => onSettings({ showDetails: !settings.showDetails })}
            />
            </div>
          )}
        </section>

        <div className="mt-auto pt-10">
          <button
            onClick={() => {
              // Phones only allow sound after a tap: unlock speech and sounds here, inside the tap.
              voice.unlock()
              unlockSounds()
              if (checklistSeen(exercise.id)) onStart()
              else setChecking(true) // first Start of this visit: a quick check before the camera opens
            }}
            className="press flex h-16 w-full items-center justify-center gap-3 bg-accent text-lg font-medium tracking-[-0.01em] text-accent-ink hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-[72px] sm:text-xl"
          >
            Start
          </button>
          <p className="label mt-3 text-center text-faint">Camera stays on this device</p>
        </div>
      </main>

      {/* Rendered straight into the page body: the screen's fade-in animation would otherwise pin it to the
          top of the page instead of the middle of the screen when you've scrolled down. */}
      {createPortal(
      <AnimatePresence>
        {checking && (
          <QuickCheck
            exercise={exercise}
            device={device}
            onClose={() => setChecking(false)}
            onGo={() => {
              markChecklistSeen(exercise.id)
              voice.unlock()
              unlockSounds()
              onStart()
            }}
          />
        )}
      </AnimatePresence>,
      document.body,
      )}
    </div>
  )
}

// ---- Quick check before the first set: three things that decide whether tracking works.
// Once per exercise per visit: the set-up differs (standing vs on the floor), so each gets its first check.
const seenKey = (exerciseId: string) => `spotter.quickcheck.seen.${exerciseId}`
function checklistSeen(exerciseId: string) {
  try {
    return sessionStorage.getItem(seenKey(exerciseId)) === '1'
  } catch {
    return false
  }
}
function markChecklistSeen(exerciseId: string) {
  try {
    sessionStorage.setItem(seenKey(exerciseId), '1') // not again before every set
  } catch {
    // storage blocked: shown again next time, which is harmless
  }
}

function quickCheckItems(exercise: Exercise, device: Device): string[] {
  const pushup = exercise.id === 'pushup'
  return [
    'Turn your volume up to hear the coach',
    'Make sure the room is bright',
    pushup
      ? device === 'phone'
        ? 'Turn your phone sideways and stay in view from head to knees'
        : 'Stay in view from head to knees'
      : 'Stay in view from head to feet',
    pushup
      ? 'Get into a plank with your side to the camera, and start after “Go”'
      : 'Stand with your side to the camera, and start after “Go”',
  ]
}

function QuickCheck({ exercise, device, onClose, onGo }: { exercise: Exercise; device: Device; onClose: () => void; onGo: () => void }) {
  const goRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    goRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-check-title"
        className="w-full max-w-[480px] border border-line bg-paper p-5 sm:p-6"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] } }}
        exit={{ y: 8, opacity: 0, transition: { duration: 0.15 } }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="quick-check-title" className="text-[24px] leading-tight tracking-[-0.02em]">
          Quick check
        </h2>
        <ol className="mt-4 grid gap-px border border-line bg-line">
          {quickCheckItems(exercise, device).map((item, i) => (
            <li key={item} className="flex items-baseline gap-3 bg-paper px-4 py-3">
              <span className="label text-faint">0{i + 1}</span>
              <span className="text-[15px] leading-snug text-pretty">{item}</span>
            </li>
          ))}
        </ol>
        {/* One button. Tapping outside or Escape closes it without starting. */}
        <button
          ref={goRef}
          onClick={onGo}
          className="press mt-5 h-14 w-full bg-accent text-[17px] font-medium text-accent-ink hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Got it, start
        </button>
        {/* Said right before the browser asks for the camera, when people wonder where the video goes. */}
        <p className="mt-3 text-center text-[13px] text-pretty text-muted">
          Your video stays on your device. Nothing is recorded or sent anywhere.
        </p>
      </motion.div>
    </motion.div>
  )
}
