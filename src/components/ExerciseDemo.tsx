// Looping demo of one good rep, drawn as a skeleton (same style as the logo and the live overlay).
// Poses come from joint angles (simple forward kinematics), so the figure moves like a body and
// matches Spotter's rules: the squat reaches parallel with the torso roughly parallel to the shins;
// the push-up keeps a straight body line and lowers until the upper arm is about level.
import { useEffect, useState } from 'react'

type Pt = { x: number; y: number }
type Pose = { lines: [Pt, Pt][]; joints: Pt[]; head: Pt; headR: number }

const GROUND = 168
const rad = (d: number) => (d * Math.PI) / 180
const add = (p: Pt, len: number, angleFromUp: number): Pt => ({ x: p.x + len * Math.sin(rad(angleFromUp)), y: p.y - len * Math.cos(rad(angleFromUp)) })

/** Squat at depth p (0 = standing, 1 = parallel). Facing right. Sized so the head fits when standing. */
function squatPose(p: number): Pose {
  const ankle = { x: 172, y: GROUND - 4 }
  const shinLean = 28 * p // shins tip forward
  const thighFromUp = -(8 + 82 * p) // thigh swings back to level (parallel)
  const torsoLean = 6 + 28 * p // torso leans, roughly parallel to the shins
  const knee = add(ankle, 32, shinLean)
  const hip = add(knee, 32, thighFromUp)
  const shoulder = add(hip, 36, torsoLean)
  const head = add(shoulder, 11, torsoLean - 4)
  const hand = add(shoulder, 28, 90 + 70 * (1 - p)) // arms reach forward for balance
  const toe = { x: ankle.x + 13, y: GROUND - 2 }
  return {
    lines: [[toe, ankle], [ankle, knee], [knee, hip], [hip, shoulder], [shoulder, hand]],
    joints: [ankle, knee, hip, shoulder],
    head,
    headR: 7,
  }
}

/** Push-up at depth p (0 = arms straight, 1 = upper arm level). Facing left, side view. */
function pushupPose(p: number): Pose {
  const wrist = { x: 96, y: GROUND - 2 }
  const toe = { x: 262, y: GROUND - 2 }
  const upper = 32
  const fore = 30
  // Top: arms straight, shoulders just ahead of the hands. Bottom: upper arm level with the floor and
  // forearm vertical (elbow right above the wrist, about 90°), so the shoulders move forward as they lower.
  const shoulderY = GROUND - 2 - (upper + fore - 0.5) + (upper + fore - 0.5 - fore) * p
  const shoulder = { x: wrist.x - 6 - (upper - 6) * p, y: shoulderY }
  // Elbow: two-link solve between shoulder and wrist, bending back towards the feet.
  const dx = wrist.x - shoulder.x
  const dy = wrist.y - shoulder.y
  const d = Math.min(Math.hypot(dx, dy), upper + fore - 0.01)
  const a = Math.acos((upper * upper + d * d - fore * fore) / (2 * upper * d))
  const base = Math.atan2(dy, dx)
  const elbow = { x: shoulder.x + upper * Math.cos(base - a), y: shoulder.y + upper * Math.sin(base - a) }
  // Straight body line from shoulder to ankle; hip on the line.
  const ankle = { x: toe.x - 6, y: GROUND - 6 }
  const hip = { x: shoulder.x + (ankle.x - shoulder.x) * 0.42, y: shoulder.y + (ankle.y - shoulder.y) * 0.42 }
  const knee = { x: shoulder.x + (ankle.x - shoulder.x) * 0.72, y: shoulder.y + (ankle.y - shoulder.y) * 0.72 }
  const head = { x: shoulder.x - 16, y: shoulder.y - 4 }
  return {
    lines: [[wrist, elbow], [elbow, shoulder], [shoulder, hip], [hip, knee], [knee, ankle], [ankle, toe]],
    joints: [elbow, shoulder, hip, knee],
    head,
    headR: 8,
  }
}

/** One rep cycle: hold top, go down, hold bottom, come up. Returns depth 0–1 and the caption step. */
const CYCLE_MS = 4200
function phase(t: number): { p: number; step: number } {
  const ms = t % CYCLE_MS
  const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2
  if (ms < 700) return { p: 0, step: 0 } // start position
  if (ms < 2100) return { p: ease((ms - 700) / 1400), step: 1 } // controlled descent
  if (ms < 2600) return { p: 1, step: 2 } // bottom
  if (ms < 3800) return { p: 1 - ease((ms - 2600) / 1200), step: 3 } // back up
  return { p: 0, step: 0 }
}

const CAPTIONS: Record<string, string[]> = {
  squat: ['Stand tall, feet side by side', 'Sit back, chest up', 'Thighs level with the floor', 'Drive up through your whole foot'],
  pushup: ['Straight line, head to heels', 'Lower with control', 'Chest near the floor', 'Push back up, arms straight'],
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

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
