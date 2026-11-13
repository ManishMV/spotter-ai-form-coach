// Looping demo of one good rep, drawn as a skeleton (same style as the logo and the live overlay).
// Poses come from joint angles (simple forward kinematics), so the figure moves like a body and
// matches Spotter's rules: the squat reaches parallel with the torso roughly parallel to the shins;
// the push-up keeps a straight body line and lowers until the upper arm is about level.
import { useEffect, useState } from 'react'
import { CAPTIONS, GROUND, phase, pushupPose, squatPose, usePrefersReducedMotion } from './demoPose'

export function ExerciseDemo({ exercise }: { exercise: string }) {
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

  // Reduced motion: a still of the key position (the bottom), with its caption.
  const { p, step } = reduced ? { p: 1, step: 2 } : phase(t)
  const pose = exercise === 'pushup' ? pushupPose(p) : squatPose(p)
  const captions = CAPTIONS[exercise] ?? CAPTIONS.squat
  const ink = 'var(--ink)'

  return (
    <figure className="m-0">
      <svg viewBox="40 40 280 140" className="h-auto w-full" role="img" aria-label={`Demo of a good ${exercise === 'pushup' ? 'push-up' : 'squat'}: ${captions.join(', ')}`}>
        <line x1="40" y1={GROUND} x2="320" y2={GROUND} stroke="var(--line)" strokeWidth="1.5" />
        <g stroke={ink} strokeWidth="3.2" strokeLinecap="round" fill="none">
          {pose.lines.map(([a, b], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
          <circle cx={pose.head.x} cy={pose.head.y} r={pose.headR} strokeWidth="2.6" />
        </g>
        {pose.joints.map((j, i) => (
          <circle key={i} cx={j.x} cy={j.y} r="3.6" fill="var(--accent)" />
        ))}
      </svg>
      <figcaption className="mt-2 grid grid-cols-4 gap-1" aria-hidden="true">
        {captions.map((c, i) => (
          <span key={c} className={`h-0.5 ${i === step ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </figcaption>
      <p className="mt-3 min-h-[1.5em] text-[15px] tracking-[-0.01em]" aria-live="off">
        {captions[step]}
      </p>
    </figure>
  )
}
