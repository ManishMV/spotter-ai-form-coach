// Side-view diagram: where to put the phone or laptop relative to the person.
// Driven by the exercise's camera hint and the device being used.
import type { Device } from '../device'
import type { CameraHint } from '../exercises/types'

const joint = (cx: number, cy: number) => <circle cx={cx} cy={cy} r="3.5" fill="var(--accent)" />

export function SetupIllustration({ camera, exercise, device }: { camera: CameraHint; exercise: string; device: Device }) {
  const onFloor = camera.height === 'floor'
  const phoneY = onFloor ? 164 : 112 // top of the phone
  const ink = 'var(--ink)'
  // Where the camera lens is, for the view lines.
  const lens = device === 'laptop' ? (onFloor ? { x: 56, y: 170 } : { x: 62, y: 120 }) : { x: 66, y: phoneY + 8 }
  const deviceName = device === 'laptop' ? 'Laptop' : 'Phone'

  return (
    <svg viewBox="0 0 400 230" className="h-auto w-full" role="img" aria-label={`${deviceName} ${onFloor ? 'on the floor' : 'at hip height'}, ${camera.distance} away, side-on`}>
      {/* ground */}
      <line x1="16" y1="190" x2="384" y2="190" stroke="var(--line)" strokeWidth="1.5" />

      {/* camera view */}
      <path d={`M${lens.x + 2} ${lens.y} L360 40 M${lens.x + 2} ${lens.y} L380 190`} stroke="var(--accent)" strokeOpacity="0.5" strokeDasharray="3 4" fill="none" />

      {device === 'laptop' ? (
        onFloor ? (
          /* laptop on the floor, screen tilted back */
          <>
            <rect x="34" y="186" width="44" height="4" fill={ink} />
            <path d="M44 186 L50 162 L66 162 L60 186 Z" fill={ink} />
            <circle cx={lens.x} cy={lens.y} r="2" fill="var(--accent)" />
          </>
        ) : (
          /* laptop on a table at about hip height */
          <>
            <path d="M24 142 H104 M32 142 V190 M96 142 V190" stroke={ink} strokeWidth="2" fill="none" />
            <rect x="40" y="136" width="44" height="5" fill={ink} />
            <path d="M48 136 L52 112 L72 112 L68 136 Z" fill={ink} />
            <circle cx={lens.x} cy={lens.y} r="2" fill="var(--accent)" />
          </>
        )
      ) : (
        /* phone + stand */
        <>
          {onFloor ? (
            <path d={`M58 190 L70 ${phoneY + 22}`} stroke={ink} strokeWidth="2" />
          ) : (
            <path d={`M64 ${phoneY + 26} V150 M64 150 L48 190 M64 150 L80 190`} stroke={ink} strokeWidth="2" fill="none" />
          )}
          <rect x="58" y={phoneY} width="12" height="24" fill={ink} />
          <circle cx={lens.x} cy={lens.y} r="2" fill="var(--accent)" />
        </>
      )}

      {/* person */}
      <g stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {exercise === 'pushup' ? (
          <>
            <circle cx="244" cy="152" r="10" />
            <path d="M262 160 L326 170 L372 186" />
            <path d="M262 160 L262 190" />
          </>
        ) : (
          <>
            <circle cx="304" cy="62" r="12" />
            <path d="M302 78 L292 128" />
            <path d="M292 128 L326 150 L312 190" />
            <path d="M300 88 L330 108" />
          </>
        )}
      </g>
      {exercise === 'pushup' ? (
        <>
          {joint(262, 160)}
          {joint(326, 170)}
          {joint(372, 186)}
        </>
      ) : (
        <>
          {joint(292, 128)}
          {joint(326, 150)}
          {joint(312, 190)}
        </>
      )}

      {/* distance */}
      <g stroke="var(--faint)" strokeWidth="1">
        <line x1="64" y1="208" x2="300" y2="208" strokeDasharray="2 3" />
        <line x1="64" y1="202" x2="64" y2="214" />
        <line x1="300" y1="202" x2="300" y2="214" />
      </g>
      <text x="182" y="226" textAnchor="middle" fill="var(--muted)" style={{ font: '500 11px var(--font-mono)', letterSpacing: '0.08em' }}>
        {camera.distance.toUpperCase()}
      </text>
    </svg>
  )
}
