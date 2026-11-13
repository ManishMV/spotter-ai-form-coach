// Home page hero: Spotter in use, as a side-view scene. A laptop on a table watches the figure squat a few
// metres away; the big rep count sits below, like the workout screen, and what the coach says comes out
// of the laptop as a speech bubble.
// The loop has three reps so the coaching shows: a good rep (counted), a half squat (not counted, "Sit
// deeper"), and a deep rep again (counted, praised "Nice depth"). Same figure maths as the setup demo.
import { useEffect, useState } from 'react'
import { CYCLE_MS, phase, squatPose, usePrefersReducedMotion } from './demoPose'

const REP_DONE_MS = 3800 // in each rep cycle, the moment the figure is back up and the rep is judged
const LOOP = [
  { depth: 1, counted: true, said: null }, // good rep: chime and count, nothing said
  { depth: 0.42, counted: false, said: 'Sit deeper' }, // half squat: doesn't count, the reason is spoken
  { depth: 1, counted: true, said: 'Nice depth' }, // the fix, praised
] as const
const SHOW_MS = 1900 // how long the count flash / speech bubble stays after a rep

export function LiveDemo() {
  const reduced = usePrefersReducedMotion()
  const [t, setT] = useState(0)
  useEffect(() => {
    if (reduced) return
    let frame = 0
    const start = performance.now()
    const loop = (now: number) => {
      setT(Math.max(0, now - start)) // a frame's timestamp can be a hair before `start`: never go negative
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [reduced])

  // Which rep of the loop we're in, and how far through it.
  const repIndex = Math.floor(t / CYCLE_MS)
  const rep = LOOP[repIndex % LOOP.length]
  const inRep = t % CYCLE_MS
  const p = reduced ? 1 : phase(t).p * rep.depth
  const pose = squatPose(p)

  // Reps judged so far (including this one once it's back up), and the last one judged.
  const judged = repIndex + (inRep >= REP_DONE_MS ? 1 : 0)
  let countedSoFar = 0
  for (let i = 0; i < judged; i++) if (LOOP[i % LOOP.length].counted) countedSoFar++
  const count = reduced ? 7 : 7 + (countedSoFar % 4) // a set in progress: 7, 8, 9, 10, then loops
  const last = judged > 0 ? LOOP[(judged - 1) % LOOP.length] : null
  const sinceJudged = inRep >= REP_DONE_MS ? inRep - REP_DONE_MS : inRep + (CYCLE_MS - REP_DONE_MS)
  const fresh = !reduced && last !== null && sinceJudged < SHOW_MS
  const flash = fresh && last.counted
  const said = reduced ? 'Nice depth' : fresh ? last.said : null
  const notCounted = fresh && !last.counted

  // The figure stands on the scene's floor, a few metres from the laptop.
  const shift = { x: 128, y: 22 }
  const ink = 'var(--ink)'

  return (
    <figure className="dot-grid m-0 border border-line p-4 sm:p-6">
      <svg
        viewBox="0 0 400 252"
        className="block h-auto w-full"
        role="img"
        aria-label="Spotter in use: a laptop watches someone squat. A good rep is counted, a half squat gets the spoken cue Sit deeper, and the next deep rep is praised: Nice depth."
      >
        {/* floor */}
        <line x1="12" y1="190" x2="388" y2="190" stroke="var(--line)" strokeWidth="1.5" />

        {/* what the camera sees */}
        <path d="M64 112 L370 34 M64 112 L384 190" stroke="var(--accent)" strokeOpacity="0.45" strokeDasharray="3 4" fill="none" />

        {/* laptop on a table, with the rep count on its screen */}
        <path d="M24 142 H112 M32 142 V190 M104 142 V190" stroke={ink} strokeWidth="2" fill="none" />
        <rect x="38" y="136" width="56" height="5" fill={ink} />
        <path d="M46 136 L51 100 L83 100 L78 136 Z" fill={ink} />
        <circle cx="64" cy="104" r="1.6" fill="var(--accent)" />
        {notCounted && (
          <text x="88" y="236" fill="var(--muted)" style={{ font: '500 8px var(--font-mono)', letterSpacing: '0.08em' }}>
            ✕ NOT COUNTED
          </text>
        )}

        {/* what the coach says out loud, as a speech bubble from the laptop */}
        {said && (
          <g>
            <path d="M14 50 H150 V80 H76 L66 92 L66 80 H14 Z" fill="var(--paper)" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M24 60 H28 L33 56 V74 L28 70 H24 Z" fill="var(--accent)" />
            <path d="M37 60 Q40 65 37 70 M40 57 Q45 65 40 73" stroke="var(--accent)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <text x="52" y="70" fill={ink} style={{ font: '500 13px var(--font-sans)', letterSpacing: '-0.01em' }}>
              {said}
            </text>
          </g>
        )}

        {/* The big rep count, like the workout screen: flashes orange when a rep counts */}
        <text x="16" y="208" fill="var(--muted)" style={{ font: '500 8px var(--font-mono)', letterSpacing: '0.12em' }}>
          REPS
        </text>
        <text x="13" y="244" fill={flash ? 'var(--accent)' : 'var(--ink)'} style={{ font: '600 38px var(--font-sans)', letterSpacing: '-0.05em' }}>
          {count}
        </text>
        <text x={count >= 10 ? 60 : 40} y="241" fill="var(--muted)" style={{ font: '400 11px var(--font-sans)' }}>
          of 10
        </text>

        {/* the person, tracked */}
        <g transform={`translate(${shift.x} ${shift.y})`}>
          <g stroke={ink} strokeWidth="3.2" strokeLinecap="round" fill="none">
            {pose.lines.map(([a, b], i) => (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            ))}
            <circle cx={pose.head.x} cy={pose.head.y} r={pose.headR} strokeWidth="2.6" />
          </g>
          {pose.joints.map((j, i) => (
            <circle key={i} cx={j.x} cy={j.y} r="3.6" fill="var(--accent)" />
          ))}
        </g>
      </svg>
    </figure>
  )
}
