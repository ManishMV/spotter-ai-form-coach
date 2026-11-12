// Workout: full-screen camera, one huge rep number, one short cue. Readable from 2–3 m.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LogoMark } from '../components/Logo'
import type { Exercise } from '../exercises'
import type { Settings } from '../settings'
import { usePoseTracking, type FrameHandler } from '../pose/usePoseTracking'
import { RepCounter, type RepPhase } from '../coach/repCounter'
import { CoachFeedback } from '../coach/feedback'
import type { Angles } from '../coach/angles'

const fmt = (deg: number | null) => (deg === null ? '—' : `${Math.round(deg)}°`)

export function Workout({ exercise, settings, onEnd }: { exercise: Exercise; settings: Settings; onEnd: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Rep counting runs on every camera frame, outside React, and only updates the screen when something changes.
  const [counter] = useState(() => (exercise.reps ? new RepCounter(exercise.reps) : null))
  const [coach] = useState(() => new CoachFeedback(exercise.cues, settings.coaching))
  const [reps, setReps] = useState(0)
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

  const onFrame = useCallback<FrameHandler>(
    (angles, timeMs, facing, inView) => {
      // Pause counting when a needed body part is out of frame (can't judge what we can't see)
      // or when facing the camera (side-view checks don't work).
      if (!counter || facing || !inView || !counting.current) return
      const rep = counter.update(angles, timeMs)
      if (rep) {
        setReps(rep.number)
        const feedback = coach.next(rep) // research-based: may stay quiet to avoid nagging
        if (feedback) {
          clearTimeout(noticeTimer.current)
          const good = feedback.tone === 'good'
          setNotice({ text: feedback.text, good })
          noticeTimer.current = window.setTimeout(() => setNotice(null), good ? 1500 : 3000)
        }
      }
      setPhase(counter.phase) // React skips the re-render when the phase hasn't changed
    },
    [counter, coach],
  )

  // Start position for this exercise: its counting metric is past the "up" threshold.
  const isAtTop = useCallback(
    (angles: Angles) => {
      const rule = exercise.reps
      const v = rule ? angles[rule.metric] : null
      return v !== null && rule !== undefined && v > rule.upAbove
    },
    [exercise.reps],
  )
  const { status, error, fps, model, readout, start, stop } = usePoseTracking(videoRef, canvasRef, {
    onFrame,
    isAtTop,
    mustSee: exercise.mustSee,
  })

  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  // Run the countdown once the camera is live: 5, 4, 3, 2, 1, Go — then start counting.
  const COUNTDOWN_FROM = 5
  useEffect(() => {
    if (status !== 'running' || counting.current) return
    setCountdown(COUNTDOWN_FROM)
    let n = COUNTDOWN_FROM
    const timer = window.setInterval(() => {
      n -= 1
      if (n === 0) counting.current = true // counting starts on "Go"
      if (n < 0) {
        window.clearInterval(timer)
        setCountdown(null)
        return
      }
      setCountdown(n)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [status])

  // Until form cues (Step 10) exist, the cue line shows set-up and tracking status.
  const cue =
    status === 'loading'
      ? 'Starting camera…'
      : !readout.side
        ? 'Step into view, side-on'
        : !readout.inView
          ? 'Move back so your whole body is in view'
          : readout.facing
          ? 'Turn to your side'
          : !counter
          ? `${exercise.name} counting is coming soon`
          : notice
            ? notice.text
            : phase === 'waiting'
            ? (exercise.reps?.startText ?? '')
            : `Tracking your ${readout.side} side`

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
      <header className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <LogoMark size={24} />
          <span className="label text-white/80">{exercise.name}</span>
        </div>
        <button onClick={onEnd} className="label press h-11 border border-white/25 bg-black/40 px-5 text-white backdrop-blur hover:bg-white hover:text-black">
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
            {countdown > 0 && <p className="label mt-4 text-white/80">Get in position</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* One short cue */}
      <p
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
          <p className="text-[clamp(120px,28vw,280px)] leading-[0.85] font-semibold tracking-[-0.05em] tabular-nums">{reps}</p>
        </div>

        {/* Live details (joint angles etc.) — toggled by "Show details" on the setup screen. */}
        {settings.showDetails && (
        <dl className="label mb-2 grid grid-cols-[auto_auto] gap-x-3 gap-y-1.5 border border-white/15 bg-black/50 p-3 text-white/80 tabular-nums backdrop-blur">
          <dt className="text-white/45">Knee</dt>
          <dd className="text-right">{fmt(readout.angles.knee)}</dd>
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
        </dl>
        )}
      </div>
    </div>
  )
}
