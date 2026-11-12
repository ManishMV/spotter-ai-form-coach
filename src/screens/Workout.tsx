// Workout: full-screen camera, one huge rep number, one short cue. Readable from 2–3 m.
import { useCallback, useEffect, useRef, useState } from 'react'
import { LogoMark } from '../components/Logo'
import type { Exercise } from '../exercises'
import { usePoseTracking, type FrameHandler } from '../pose/usePoseTracking'
import { RepCounter, type RepPhase } from '../coach/repCounter'

const fmt = (deg: number | null) => (deg === null ? '—' : `${Math.round(deg)}°`)

export function Workout({ exercise, onEnd }: { exercise: Exercise; onEnd: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Rep counting runs on every camera frame, outside React, and only updates the screen when something changes.
  const [counter] = useState(() => (exercise.reps ? new RepCounter(exercise.reps) : null))
  const [reps, setReps] = useState(0)
  const [phase, setPhase] = useState<RepPhase>('waiting')
  const onFrame = useCallback<FrameHandler>(
    (angles, timeMs) => {
      if (!counter) return
      const rep = counter.update(angles, timeMs)
      if (rep) setReps(rep.number)
      setPhase(counter.phase) // React skips the re-render when the phase hasn't changed
    },
    [counter],
  )

  const { status, error, fps, model, readout, start, stop } = usePoseTracking(videoRef, canvasRef, onFrame)

  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  // Until form cues (Step 10) exist, the cue line shows set-up and tracking status.
  const cue =
    status === 'loading'
      ? 'Starting camera…'
      : !readout.side
        ? 'Step into view, side-on'
        : !counter
          ? `${exercise.name} counting is coming soon`
          : phase === 'waiting'
            ? 'Stand tall to start'
            : `Tracking your ${readout.side} side`

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white [color-scheme:dark]">
      {/* Camera + skeleton, mirrored so it feels like a mirror. */}
      <div className="absolute inset-0 -scale-x-100">
        <video ref={videoRef} className="absolute inset-0 size-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 size-full object-cover" />
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

      {/* One short cue */}
      <p
        aria-live="polite"
        className="absolute inset-x-4 top-20 text-center text-[clamp(22px,4.5vw,44px)] leading-tight font-medium tracking-[-0.02em] text-balance sm:top-24"
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

        {/* Temporary dev readout for tuning thresholds. Removed in the polish pass (Step 16). */}
        <dl className="label mb-2 grid grid-cols-[auto_auto] gap-x-3 gap-y-1.5 border border-white/15 bg-black/50 p-3 text-white/80 tabular-nums backdrop-blur">
          <dt className="text-white/45">Knee</dt>
          <dd className="text-right">{fmt(readout.angles.knee)}</dd>
          <dt className="text-white/45">Hip</dt>
          <dd className="text-right">{fmt(readout.angles.hip)}</dd>
          <dt className="text-white/45">Elbow</dt>
          <dd className="text-right">{fmt(readout.angles.elbow)}</dd>
          <dt className="text-white/45">Phase</dt>
          <dd className="text-right">{phase}</dd>
          <dt className="text-white/45">{model}</dt>
          <dd className="text-right">{fps} fps</dd>
        </dl>
      </div>
    </div>
  )
}
