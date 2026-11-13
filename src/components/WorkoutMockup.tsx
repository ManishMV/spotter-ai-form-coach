// A still mock-up of the workout screen inside a phone, for the home page: what training with Spotter
// looks like (tracking lines, the cue, the big rep count), without needing a camera. Drawn in SVG so it
// stays sharp at any size. The workout screen is always dark, so its colours are fixed, not themed.
const rad = (d: number) => (d * Math.PI) / 180
type Pt = { x: number; y: number }
const add = (p: Pt, len: number, angleFromUp: number): Pt => ({
  x: p.x + len * Math.sin(rad(angleFromUp)),
  y: p.y - len * Math.cos(rad(angleFromUp)),
})

export function WorkoutMockup() {
  // A squat at parallel, facing right (same proportions as the app's demo figure).
  const ground = 452
  const ankle = { x: 152, y: ground - 6 }
  const knee = add(ankle, 80, 28)
  const hip = add(knee, 80, -90)
  const shoulder = add(hip, 90, 34)
  const head = add(shoulder, 32, 34) // neck gap so the head clears the arms
  const hand = add(shoulder, 66, 104) // arms forward, slightly below shoulder height
  const toe = { x: ankle.x + 26, y: ground - 3 }
  const accent = '#ff5a1f'

  return (
    <svg
      viewBox="0 0 300 600"
      className="mx-auto h-auto w-full max-w-[300px]"
      role="img"
      aria-label="Spotter's workout screen on a phone: a squat being tracked, 7 reps counted, and the cue Keep your chest up"
    >
      <defs>
        <linearGradient id="mock-room" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#23272e" />
          <stop offset="0.75" stopColor="#15181d" />
          <stop offset="1" stopColor="#0d0f12" />
        </linearGradient>
        <linearGradient id="mock-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.7" />
        </linearGradient>
        <clipPath id="mock-screen">
          <rect x="14" y="14" width="272" height="572" rx="34" />
        </clipPath>
      </defs>

      {/* Phone body */}
      <rect x="2" y="2" width="296" height="596" rx="44" fill="#000" stroke="var(--line)" strokeWidth="2" />

      <g clipPath="url(#mock-screen)">
        {/* The "camera feed": a dim room with a floor */}
        <rect x="14" y="14" width="272" height="572" fill="url(#mock-room)" />
        <rect x="14" y={ground} width="272" height={586 - ground} fill="#101216" />
        <line x1="14" y1={ground} x2="286" y2={ground} stroke="#2c3138" strokeWidth="2" />

        {/* Tracking skeleton */}
        <g stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.95">
          {[
            [toe, ankle],
            [ankle, knee],
            [knee, hip],
            [hip, shoulder],
            [shoulder, hand],
          ].map(([a, b], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          ))}
          <circle cx={head.x} cy={head.y} r="15" strokeWidth="5" />
        </g>
        {[ankle, knee, hip, shoulder].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="7" fill={accent} />
        ))}

        <rect x="14" y="380" width="272" height="206" fill="url(#mock-shade)" />

        {/* Top bar: exercise and the End button */}
        <text x="34" y="66" fill="#fff" fillOpacity="0.75" style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.12em' }}>
          SQUAT
        </text>
        <rect x="216" y="48" width="52" height="26" fill="#fff" />
        <text x="242" y="65" textAnchor="middle" fill="#000" style={{ font: '600 10px var(--font-mono)', letterSpacing: '0.1em' }}>
          END
        </text>

        {/* The one cue */}
        <text x="150" y="124" textAnchor="middle" fill="#fff" style={{ font: '500 21px var(--font-sans)', letterSpacing: '-0.02em' }}>
          Keep your chest up
        </text>

        {/* Big rep count */}
        <text x="34" y="490" fill="#fff" fillOpacity="0.7" style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.12em' }}>
          REPS
        </text>
        <text x="28" y="566" fill="#fff" style={{ font: '600 92px var(--font-sans)', letterSpacing: '-0.05em' }}>
          7
        </text>
        <text x="96" y="562" fill="#fff" fillOpacity="0.6" style={{ font: '400 16px var(--font-sans)' }}>
          of 10
        </text>
      </g>

      {/* Front camera */}
      <rect x="120" y="24" width="60" height="16" rx="8" fill="#000" />
    </svg>
  )
}
