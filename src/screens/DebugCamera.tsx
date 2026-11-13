// Developer view (open with ?debug): plain camera + skeleton + big angle readout. Used for testing tracking.
// `?debug&ex=pushup` checks the push-up's body parts (default: squat) for the "room to spare" readout, used
// to find the closest workable distance: step closer until the tightest room during a rep nears 0.
import { useRef } from 'react'
import { EXERCISES } from '../exercises'
import { usePoseTracking } from '../pose/usePoseTracking'

const exercise = EXERCISES.find((e) => e.id === new URLSearchParams(location.search).get('ex')) ?? EXERCISES[0]
const pct = (n: number | null) => (n === null ? 'out' : `${Math.round(n * 100)}%`)

const fmt = (deg: number | null) => (deg === null ? '—' : `${Math.round(deg)}°`)
const num = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(2))

export function DebugCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { status, error, fps, analysisMs, model, readout, start } = usePoseTracking(videoRef, canvasRef, {
    debug: true,
    mustSee: exercise.mustSee,
  })
  const tightest = readout.roomTightest

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-black text-white">
      <div className="relative size-full -scale-x-100">
        <video ref={videoRef} className="absolute inset-0 size-full object-contain" playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 size-full object-contain" />
      </div>

      {status !== 'running' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          {status === 'idle' && (
            <button onClick={start} className="bg-white px-10 py-5 text-xl font-semibold text-black">
              Start camera
            </button>
          )}
          {status === 'loading' && <p className="text-lg">Loading camera and pose model…</p>}
          {status === 'error' && <p className="max-w-md text-lg text-red-400">Couldn't start: {error}</p>}
        </div>
      )}

      {status === 'running' && (
        <>
          <p className="absolute top-4 left-4 bg-black/60 px-2 py-1 font-mono text-sm">
            {fps} fps · {model} · {analysisMs} ms per analysis
          </p>
          <dl className="absolute top-4 right-4 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 bg-black/70 px-5 py-4 font-mono text-2xl tabular-nums">
            <dt className="text-white/60">{exercise.id} room</dt>
            <dd className="text-right">{pct(readout.room)}</dd>
            <dt className="text-white/60">tightest 5 s</dt>
            <dd className={`text-right ${tightest === null ? 'text-red-400' : tightest < 0.03 ? 'text-amber-300' : 'text-emerald-300'}`}>{pct(tightest)}</dd>
            <dt className="text-white/60">side</dt>
            <dd className="text-right">{readout.facing ? 'facing camera' : readout.side ? `your ${readout.side}` : '—'}</dd>
            <dt className="text-white/60">knee</dt>
            <dd className="text-right">{fmt(readout.angles.knee)}</dd>
            <dt className="text-white/60">hip</dt>
            <dd className="text-right">{fmt(readout.angles.hip)}</dd>
            <dt className="text-white/60">elbow</dt>
            <dd className="text-right">{fmt(readout.angles.elbow)}</dd>
            <dt className="text-white/60">split 3D</dt>
            <dd className="text-right">{num(readout.diag?.worldSplit)}</dd>
            <dt className="text-white/60">split 2D</dt>
            <dd className="text-right">{num(readout.diag?.screenSplit)}</dd>
            <dt className="text-white/60">near ankle</dt>
            <dd className="text-right">{num(readout.diag?.nearAnkleVis)}</dd>
            <dt className="text-white/60">far ankle</dt>
            <dd className="text-right">{num(readout.diag?.farAnkleVis)}</dd>
          </dl>
        </>
      )}
    </main>
  )
}
