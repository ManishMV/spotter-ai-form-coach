// Workout: full-screen camera, one huge rep number, one short cue. Readable from across the room.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LogoMark } from '../components/Logo'
import { GetSetChecklist } from '../components/GetSetChecklist'
import { detectDevice } from '../device'
import { track } from '../analytics'
import type { Exercise } from '../exercises'
import type { Settings } from '../settings'
import { usePoseTracking, type FrameHandler } from '../pose/usePoseTracking'
import { RepCounter, type RepPhase } from '../coach/repCounter'
import { CoachFeedback } from '../coach/feedback'
import { SetTracker, type SetSummary } from '../coach/setTracker'
import { SetEnder } from '../coach/setEnd'
import type { Angles } from '../coach/angles'
import { voice } from '../voice'
import { announceRep, announceRestLine, resetSpeechPolicy } from '../voice/announce'
import { playSound } from '../voice/sounds'
import { moveBackPrompt, POSITION } from '../voice/lines'

/** Prompts about where to stand. Spoken when they appear, at most every few seconds each. */
const PROMPT_REPEAT_MS = 6000
/** Keep counting through a drop out of view this short in the middle of a rep (deep squat bottoms). */
const OUT_OF_VIEW_GRACE_MS = 1500
/** Each where-to-stand prompt is spoken at most this many times per set; after that it's shown only. */
const MAX_PROMPT_REPEATS = 2

const fmt = (deg: number | null) => (deg === null ? '—' : `${Math.round(deg)}°`)

export function Workout({
  exercise,
  settings,
  onEnd,
}: {
  exercise: Exercise
  settings: Settings
  /** Called with the set's summary when the set ends (target reached, inactivity, or End tapped). */
  onEnd: (summary: SetSummary) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Rep counting runs on every camera frame, outside React, and only updates the screen when something changes.
  const [counter] = useState(() => (exercise.reps ? new RepCounter(exercise.reps) : null))
  const [coach] = useState(() => new CoachFeedback(exercise.cues, settings.coaching))
  const [tracker] = useState(() => new SetTracker(exercise.cues, settings.targetReps, exercise.reps?.metric ?? null)) // for the summary
  const [ender] = useState(() => new SetEnder(settings.targetReps, Date.now())) // target + inactivity finish
  const [reps, setReps] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(settings.showDetails)
  const [phase, setPhase] = useState<RepPhase>('waiting')
  // A short message after each rep, then it clears itself:
  // why a rep didn't count, the top form fix for a counted rep, or "Good rep".
  const [notice, setNotice] = useState<{ text: string; good: boolean } | null>(null)
  const noticeTimer = useRef(0)
  useEffect(() => () => clearTimeout(noticeTimer.current), [])

  // Start countdown: gives the user time to walk back from the device before counting begins.
  // null = not started yet / finished; 0 = "Go".
  const [countdown, setCountdown] = useState<number | null>(null)
  const counting = useRef(false) // read inside the per-frame handler
  const countAloud = useRef(settings.countAloud)
  // Finishing: once, and without cutting off the last thing said (the summary waits for silence).
  const finished = useRef(false)
  // Tracking speed during the set (median fps), reported in tester results.
  const fpsLog = useRef<number[]>([])
  const modelRef = useRef('')
  const finish = useCallback((endedBy: 'target' | 'idle' | 'end') => {
    if (finished.current) return
    finished.current = true
    counting.current = false
    const speeds = [...fpsLog.current].sort((a, b) => a - b)
    const tech = { device: detectDevice(), model: modelRef.current, fps: speeds[Math.floor(speeds.length / 2)] ?? 0 }
    onEnd({ ...tracker.summary(), tech, endedBy })
  }, [onEnd, tracker])
  useEffect(() => {
    resetSpeechPolicy() // a new set starts with a clean slate
    return () => {
      if (!finished.current) voice.stop() // left mid-set: stop talking
    }
  }, [])
  const lastPhase = useRef<RepPhase>('waiting')
  const outOfViewSince = useRef<number | null>(null) // when a needed body part left the picture (mid-rep grace)
  const partlyOutOfView = useRef(false) // body seen but a needed part cut off (pauses the auto-finish timer)

  const onFrame = useCallback<FrameHandler>(
    (angles, timeMs, facing, inView) => {
      // Pause counting when a needed body part is out of frame (can't judge what we can't see)
      // or when facing the camera (side-view checks don't work). Exception: a brief drop out of view in
      // the middle of a rep. At the bottom of a very deep squat the feet or knees can slip out of sight
      // for a moment; pausing then missed the deepest point and wrongly said "Sit deeper" (Nov 14).
      // Angles for parts the tracker can't see stay empty, so nothing is guessed.
      if (!counter || facing || !counting.current) return
      if (inView) outOfViewSince.current = null
      else {
        outOfViewSince.current ??= timeMs
        const midRep = counter.phase !== 'waiting'
        if (!midRep || timeMs - outOfViewSince.current > OUT_OF_VIEW_GRACE_MS) return
      }
      const rep = counter.update(angles, timeMs)
      // Going down into a rep, or finishing one, is activity: it keeps the set from auto-finishing.
      if (rep || (counter.phase === 'down' && lastPhase.current !== 'down')) {
        if (ender.onActivity(Date.now())?.type === 'cancelled') setNotice(null) // kept going: drop the warning
      }
      lastPhase.current = counter.phase
      if (rep) {
        setReps(rep.number)
        tracker.onRep(rep)
        const feedback = coach.next(rep) // research-based: may stay quiet to avoid nagging

        const isFinal = rep.counted && ender.reachedTarget(rep.number)
        announceRep(rep, feedback, countAloud.current, isFinal) // sound + voice, for users away from the screen
        if (isFinal) finish('target')

        if (feedback?.tone === 'fix') tracker.onCue(feedback.text)
        if (feedback) {
          clearTimeout(noticeTimer.current)
          const good = feedback.tone === 'good'
          setNotice({ text: feedback.text, good })
          noticeTimer.current = window.setTimeout(() => setNotice(null), good ? 1500 : 3000)
        }
      }
      setPhase(counter.phase) // React skips the re-render when the phase hasn't changed
    },
    [counter, coach, tracker, ender, finish],
  )

  // Inactivity finish: checked every 0.1 s once counting has started (keeps the 5-4-3-2-1 evenly spaced).
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!counting.current || !counter) return
      // Partly out of view (body seen, a needed part cut off): counting is paused, so the auto-finish
      // timer waits too. Fixing your position should never end the set. Walking out of the picture
      // completely still counts as stopping.
      if (partlyOutOfView.current) {
        if (ender.onActivity(Date.now())?.type === 'cancelled') setNotice(null)
        return
      }
      const event = ender.tick(Date.now(), counter.phase === 'down')
      if (!event) return
      if (event.type === 'rest') {
        if (announceRestLine(event.text)) setNotice({ text: event.text, good: true })
      } else if (event.type === 'say') {
        if (event.tick) playSound('tick')
        voice.say(event.text, { interrupt: true })
        setNotice({ text: event.text === 'Finishing the set' ? 'Finishing the set…' : event.text, good: false })
      } else if (event.type === 'end') {
        finish('idle')
      }
    }, 100) // every 0.1 s, so countdown numbers land within 0.1 s of each exact second
    return () => window.clearInterval(timer)
  }, [counter, ender, finish])

  // Start position for this exercise: its counting metric is past the "up" threshold.
  const isAtTop = useCallback(
    (angles: Angles) => {
      const rule = exercise.reps
      const v = rule ? angles[rule.metric] : null
      return v !== null && rule !== undefined && v > rule.upAbove
    },
    [exercise.reps],
  )
  const { status, error, fps, analysisMs, model, readout, start, stop } = usePoseTracking(videoRef, canvasRef, {
    onFrame,
    isAtTop,
    mustSee: exercise.mustSee,
  })

  useEffect(() => {
    start()
    return stop
  }, [start, stop])
  useEffect(() => {
    partlyOutOfView.current = !!readout.side && !readout.inView
  }, [readout])
  useEffect(() => {
    modelRef.current = model
    if (counting.current && fps > 0) fpsLog.current.push(fps)
  }, [fps, model])

  // Getting ready, calmly: no countdown until the user is clearly set — in view, side-on, every needed
  // body part visible and in the start position — for a full second. Then a short 3-2-1-Go.
  // If they step out or turn during the countdown, it stops and waits again.
  const COUNTDOWN_FROM = 3
  const READY_HOLD_MS = 1000 // in position this long before the countdown starts
  const LOST_MS = 600 // out of position this long during the countdown cancels it
  // In place = visible, side-on and every needed part in the picture. To start, also in the start position.
  // Once the countdown runs, only leaving your place stops it: shifting your stance or starting a rep early
  // doesn't (the rep counter waits for the start position after "Go" anyway).
  const [started, setStarted] = useState(false) // past "Go": the Get set checklist is no longer shown
  // Push-ups on a phone held upright: the body (long and flat) only fits from further back. Portrait is
  // allowed (some people keep auto-rotate off); the hint shows only while the body doesn't fit.
  const [portrait, setPortrait] = useState(() => matchMedia('(orientation: portrait)').matches)
  useEffect(() => {
    const mq = matchMedia('(orientation: portrait)')
    const onChange = () => setPortrait(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  const uprightPhone = exercise.camera.height === 'floor' && portrait && detectDevice() === 'phone'
  const needsRotate = uprightPhone && status === 'running' && !started && !(readout.side && readout.inView)
  const inPlace = status === 'running' && !!readout.side && readout.inView && !readout.facing
  const ready = inPlace && isAtTop(readout.angles)
  const countdownTimer = useRef(0)
  useEffect(() => () => window.clearInterval(countdownTimer.current), [])
  useEffect(() => {
    if (counting.current || finished.current) return
    if (ready && countdown === null) {
      let t = 0
      const begin = () => {
        // Let a set-up prompt that's still playing finish first, so "3" never cuts into it.
        if (voice.isSpeaking()) {
          t = window.setTimeout(begin, 200)
          return
        }
        // 3, 2, 1, Go: one beat per second, each spoken over its tick.
        let n = COUNTDOWN_FROM
        setCountdown(n)
        playSound('tick')
        voice.say(String(n), { interrupt: true })
        countdownTimer.current = window.setInterval(() => {
          n -= 1
          if (n < 0) {
            window.clearInterval(countdownTimer.current)
            setCountdown(null)
            return
          }
          if (n === 0) {
            counting.current = true // counting starts on "Go"
            setStarted(true)
            tracker.start()
            track('counting_started', { exercise: exercise.id })
          }
          setCountdown(n)
          playSound(n === 0 ? 'go' : 'tick')
          voice.say(n === 0 ? 'Go' : String(n), { interrupt: true })
        }, 1000)
      }
      t = window.setTimeout(begin, READY_HOLD_MS)
      return () => window.clearTimeout(t)
    }
    if (!inPlace && countdown !== null && countdown > 0) {
      const t = window.setTimeout(() => {
        window.clearInterval(countdownTimer.current) // they moved away: wait until they're set again
        voice.stop()
        setCountdown(null)
      }, LOST_MS)
      return () => window.clearTimeout(t)
    }
  }, [ready, inPlace, countdown, tracker, exercise.id])

  // The cue line: set-up and positioning first, then the latest rep feedback, then status.
  const cue =
    status === 'loading'
      ? 'Starting camera…'
      : countdown !== null
      ? ''
      : needsRotate
      ? POSITION.rotate
      : !readout.side
        ? POSITION.stepIntoView
        : !readout.inView
          ? moveBackPrompt(readout.missing)
          : readout.facing
          ? POSITION.turn
          : !counter
          ? `${exercise.name} counting is coming soon`
          : notice
            ? notice.text
            : phase === 'waiting'
            ? (exercise.reps?.startText ?? '')
            : `Tracking your ${readout.side} side`

  // The Get set checklist: shown before "Go" while the camera runs (not during the countdown or the set).
  const showChecklist = status === 'running' && !started && countdown === null && !needsRotate && !!counter
  const checklist = [
    { label: 'Side-on to the camera', ok: !!readout.side && !readout.facing },
    { label: exercise.camera.height === 'floor' ? 'Head to knees in view' : 'Whole body in view', ok: !!readout.side && readout.inView },
    { label: exercise.reps?.startText ?? 'In the start position', ok: !!readout.side && readout.inView && !readout.facing && isAtTop(readout.angles) },
  ]

  // Speak where-to-stand prompts calmly: only once a prompt has stayed on screen for a moment (so a
  // flicker doesn't trigger speech), one at a time, never over the countdown, and not repeated too often.
  const PROMPT_SETTLE_MS = 2000 // on screen this long before it's spoken
  const PROMPT_GAP_MS = 4000 // at least this long between any two spoken set-up prompts
  // Quiet start: the first seconds after the camera comes on are for propping up the device and walking
  // back, so prompts are only shown, not spoken, until then.
  const QUIET_START_MS = 4000
  const cameraOnAt = useRef<number | null>(null)
  useEffect(() => {
    if (status === 'running' && cameraOnAt.current === null) {
      cameraOnAt.current = Date.now()
      track('camera_started', { exercise: exercise.id, model })
    }
    if (status === 'error') track('camera_failed', { exercise: exercise.id, error })
  }, [status, exercise.id, model, error])
  const isPrompt =
    status === 'running' &&
    countdown === null &&
    ((Object.values(POSITION) as string[]).includes(cue) || cue === exercise.reps?.startText)
  const lastPrompt = useRef<{ text: string; at: number } | null>(null)
  const promptsSaid = useRef(new Map<string, number>()) // each prompt is spoken at most twice per set
  useEffect(() => {
    if (!isPrompt) return
    let t = 0
    const trySay = () => {
      const now = Date.now()
      const last = lastPrompt.current
      // Something is playing, or the last prompt was moments ago: check again shortly (still shown on screen).
      const quietUntil = (cameraOnAt.current ?? now) + QUIET_START_MS
      const waitMs = voice.isSpeaking()
        ? 300
        : Math.max(quietUntil - now, last ? last.at + PROMPT_GAP_MS - now : 0)
      if (waitMs > 0) {
        t = window.setTimeout(trySay, waitMs)
        return
      }
      if (last && last.text === cue && now - last.at < PROMPT_REPEAT_MS) {
        t = window.setTimeout(trySay, last.at + PROMPT_REPEAT_MS - now)
        return
      }
      const said = promptsSaid.current.get(cue) ?? 0
      if (said >= MAX_PROMPT_REPEATS) return // after that it stays on screen only
      promptsSaid.current.set(cue, said + 1)
      lastPrompt.current = { text: cue, at: now }
      voice.say(cue, { interrupt: false })
    }
    t = window.setTimeout(trySay, PROMPT_SETTLE_MS)
    return () => window.clearTimeout(t)
  }, [isPrompt, cue])

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white [color-scheme:dark]">
      {/* Camera + skeleton, mirrored so it feels like a mirror. Shown whole ("contain", not cropped)
          so the user sees exactly what the tracker sees — head and feet included on wide laptop screens. */}
      <div className="absolute inset-0 -scale-x-100">
        <video ref={videoRef} className="absolute inset-0 size-full object-contain" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 size-full object-contain" />
      </div>

      {/* Shading so text stays readable on any background. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/80 to-transparent" />

      {/* Top bar */}
      {/* z-20: always above the details panel, so End is never covered (it was, on landscape phones). */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <LogoMark size={24} />
          <span className="label text-white/80">{exercise.name}</span>
        </div>
        {/* Solid white so it reads on any camera background (was see-through and got lost on bright rooms). */}
        <button onClick={() => finish('end')} className="label press h-11 bg-white px-6 text-black shadow-[0_1px_8px_rgba(0,0,0,0.35)] hover:bg-accent hover:text-white">
          End
        </button>
      </header>

      {/* Start countdown: huge, centred, readable from across the room. */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.2, 0, 0, 1] } }}
            exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.2 } }}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
            aria-live="assertive"
          >
            <p className="text-[clamp(120px,30vw,320px)] leading-none font-semibold tracking-[-0.05em] text-accent tabular-nums">
              {countdown === 0 ? 'Go' : countdown}
            </p>
            {countdown > 0 && <p className="label mt-4 text-white/80">Hold still</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Before "Go": a live checklist of what Spotter needs, instead of a single prompt line. */}
      {showChecklist && (
        <div className="absolute inset-x-4 top-20 z-10 flex justify-center sm:top-24">
          <GetSetChecklist items={checklist} />
        </div>
      )}

      {/* Push-ups on an upright phone that doesn't fit the body yet: a hint (not a wall) in the checklist's place. */}
      {needsRotate && (
        <div className="absolute inset-x-4 top-20 z-10 flex justify-center sm:top-24">
          <div role="status" className="w-full max-w-[420px] border border-white/15 bg-black/70 px-4 py-4 text-left backdrop-blur">
            <div className="flex items-center gap-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="7" y="2.5" width="10" height="19" rx="2" />
                <path d="M20.5 9.5a8 8 0 0 1-3 8.5M20.5 9.5V13M20.5 9.5H17" />
              </svg>
              <p className="text-[18px] leading-tight font-medium tracking-[-0.01em]">Turn your phone sideways</p>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-pretty text-white/75">
              Push-ups fit best in landscape. Or keep it upright and move it further back, so you fit from head to knees.
            </p>
            <p className="mt-2 text-[13px] text-white/55">Screen not turning? Switch on auto-rotate.</p>
          </div>
        </div>
      )}

      {/* Mid-set and partly out of view: say plainly that counting is paused, and why. */}
      {started && countdown === null && !!readout.side && !readout.inView && (
        <p className="label absolute inset-x-0 top-[9.5rem] z-10 text-center text-accent sm:top-44">Counting paused · you're out of view</p>
      )}

      {/* One short cue */}
      <p
        hidden={showChecklist || needsRotate}
        aria-live="polite"
        className={`absolute inset-x-4 top-20 text-center text-[clamp(22px,4.5vw,44px)] leading-tight font-medium tracking-[-0.02em] text-balance sm:top-24 ${notice?.good && cue === notice.text ? 'text-accent' : ''}`}
      >
        {status === 'error' ? "Couldn't start the camera" : cue}
      </p>

      {status === 'error' && (
        <div className="absolute inset-x-4 top-44 flex flex-col items-center gap-4 text-center">
          <p className="max-w-sm text-white/70">{error}. Allow camera access and try again.</p>
          <button onClick={start} className="press h-12 bg-accent px-6 font-medium text-white">
            Try again
          </button>
        </div>
      )}

      {/* Huge rep number */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 sm:p-8">
        <div>
          <p className="label text-white/70">Reps</p>
          {/* Each new rep rises in and flashes orange, so a glance from across the room confirms it counted. */}
          <motion.p
            key={reps}
            initial={reps === 0 ? false : { y: 24, opacity: 0.4, scale: 0.94, color: 'var(--accent)' }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              color: '#ffffff',
              transition: { duration: 0.28, ease: [0.2, 0, 0, 1], color: { duration: 0.7, ease: 'easeOut' } },
            }}
            className="origin-bottom-left text-[clamp(64px,min(28vw,30vh),280px)] leading-[0.85] font-semibold tracking-[-0.05em] tabular-nums"
          >
            {reps}
          </motion.p>
        </div>

        {/* Live details (joint angles etc.). Starts open or closed from "Show details" on the setup screen,
            and can be opened or closed any time, even mid-set. */}
        <div className="mb-2 flex flex-col items-end">
        <button
          onClick={() => setDetailsOpen((o) => !o)}
          aria-expanded={detailsOpen}
          aria-controls="live-details"
          className="label press flex h-11 items-center gap-2 border border-white/15 bg-black/50 px-3 text-white/80 backdrop-blur hover:text-white"
        >
          Details
          <span aria-hidden="true" className={`transition-transform duration-150 ${detailsOpen ? '' : 'rotate-180'}`}>
            ⌄
          </span>
        </button>
        {detailsOpen && (
        <dl id="live-details" className="label mt-1 grid max-h-[calc(100dvh-10rem)] overflow-y-auto grid-cols-[auto_auto] gap-x-3 gap-y-1.5 border border-white/15 bg-black/50 p-3 text-white/80 tabular-nums backdrop-blur">
          <dt className="text-white/45">Knee</dt>
          <dd className="text-right">{fmt(readout.angles.knee)}</dd>
          <dt className="text-white/45">Thigh</dt>
          <dd className="text-right">{fmt(readout.angles.thighTilt)}</dd>
          <dt className="text-white/45">Hip</dt>
          <dd className="text-right">{fmt(readout.angles.hip)}</dd>
          <dt className="text-white/45">Elbow</dt>
          <dd className="text-right">{fmt(readout.angles.elbow)}</dd>
          <dt className="text-white/45">Arm</dt>
          <dd className="text-right">{fmt(readout.angles.upperArm)}</dd>
          <dt className="text-white/45">Knee lift</dt>
          <dd className="text-right">{readout.angles.kneeLift === null ? '—' : readout.angles.kneeLift.toFixed(2)}</dd>
          <dt className="text-white/45">Split</dt>
          <dd className="text-right">{readout.angles.stanceSplit === null ? '—' : readout.angles.stanceSplit.toFixed(2)}</dd>
          <dt className="text-white/45">Bal</dt>
          <dd className="text-right">{readout.angles.balance === null ? '—' : readout.angles.balance.toFixed(2)}</dd>
          <dt className="text-white/45">Lean</dt>
          <dd className="text-right">{fmt(readout.angles.torsoLean)}</dd>
          <dt className="text-white/45">Phase</dt>
          <dd className="text-right">{phase}</dd>
          <dt className="text-white/45">{model}</dt>
          <dd className="text-right">{fps} fps</dd>
          <dt className="text-white/45">Analysis</dt>
          <dd className="text-right">{analysisMs} ms</dd>
        </dl>
        )}
        </div>
      </div>
    </div>
  )
}
