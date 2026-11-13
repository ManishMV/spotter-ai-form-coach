// Home page hero: the looping squat figure, shown as Spotter in use. The workout screen's parts sit around
// it (exercise label, End button, the rep count ticking up, "Good rep" after each one), so visitors see
// what training with Spotter looks like before turning on a camera. Same figure maths as the setup demo.
// The workout screen is always dark, so these colours are fixed rather than themed.
import { useEffect, useState } from 'react'
import { CYCLE_MS, phase, squatPose, usePrefersReducedMotion } from './demoPose'

const ACCENT = '#ff5a1f'
const REP_DONE_MS = 3800 // in each cycle, the moment the figure is back up: the rep counts

export function LiveDemo() {
  const reduced = usePrefersReducedMotion()
  const [t, setT] = useState(0)
  useEffect(() => {
    if (reduced) return
    let frame = 0
    const start = performance.now()
    const loop = (now: number) => {
      setT(now - start)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [reduced])

  const cycle = Math.floor(t / CYCLE_MS)
  const inCycle = t % CYCLE_MS
  const { p } = reduced ? { p: 1 } : phase(t)
  const pose = squatPose(p)
  // A set in progress: the count goes 7, 8, 9, 10 as each rep finishes, then loops back to 7.
  const done = cycle + (inCycle >= REP_DONE_MS ? 1 : 0)
  const reps = reduced ? 7 : 7 + (done % 4)
  const justCounted = !reduced && (inCycle >= REP_DONE_MS || (cycle > 0 && inCycle < 700))

  return (
    <figure className="m-0 overflow-hidden border border-line bg-[#0d0f12]">
      <svg
        viewBox="40 0 280 200"
        className="block h-auto w-full"
        role="img"
        aria-label="Spotter in use: a squat being tracked, with the rep count going up and Good rep after each rep"
      >
        <defs>
          <linearGradient id="live-room" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#23272e" />
            <stop offset="1" stopColor="#111317" />
          </linearGradient>
          <linearGradient id="live-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {/* The "camera feed": a dim room with a floor */}
        <rect x="40" y="0" width="280" height="168" fill="url(#live-room)" />
        <rect x="40" y="168" width="280" height="32" fill="#0f1114" />
        <line x1="40" y1="168" x2="320" y2="168" stroke="#2c3138" strokeWidth="1.2" />

        {/* Tracking skeleton */}
        <g stroke="#fff" strokeWidth="3.2" strokeLinecap="round" fill="none">
          {pose.lines.map(([a, b], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
          <circle cx={pose.head.x} cy={pose.head.y} r={pose.headR} strokeWidth="2.6" />
        </g>
        {pose.joints.map((j, i) => (
          <circle key={i} cx={j.x} cy={j.y} r="3.6" fill={ACCENT} />
        ))}

        <rect x="40" y="130" width="280" height="70" fill="url(#live-shade)" />

        {/* Top bar: exercise and the End button */}
        <text x="52" y="17" fill="#fff" fillOpacity="0.7" style={{ font: '500 6px var(--font-mono)', letterSpacing: '0.12em' }}>
          SQUAT
        </text>
        <rect x="282" y="8" width="28" height="13" fill="#fff" />
        <text x="296" y="16.6" textAnchor="middle" fill="#000" style={{ font: '600 5.5px var(--font-mono)', letterSpacing: '0.1em' }}>
          END
        </text>

        {/* The cue line: "Good rep" right after each counted rep, like the real screen */}
        {justCounted && (
          <text x="180" y="34" textAnchor="middle" fill={ACCENT} style={{ font: '500 11px var(--font-sans)', letterSpacing: '-0.01em' }}>
            Good rep
          </text>
        )}

        {/* Big rep count */}
        <text x="52" y="160" fill="#fff" fillOpacity="0.7" style={{ font: '500 5.5px var(--font-mono)', letterSpacing: '0.12em' }}>
          REPS
        </text>
        <text x="49" y="192" fill={justCounted ? ACCENT : '#fff'} style={{ font: '600 36px var(--font-sans)', letterSpacing: '-0.05em' }}>
          {reps}
        </text>
        <text x={reps >= 10 ? 92 : 75} y="190" fill="#fff" fillOpacity="0.55" style={{ font: '400 8px var(--font-sans)' }}>
          of 10
        </text>
      </svg>
    </figure>
  )
}
