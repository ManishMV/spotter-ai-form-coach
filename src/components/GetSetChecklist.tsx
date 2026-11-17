// "Get set": before the countdown, the three things Spotter needs, ticking green as it sees each one.
// Replaces a single prompt line, so people see exactly what's missing and that the count starts on "Go".
export type ChecklistItem = { label: string; ok: boolean }

/** Live distance guide: where you are between "too close" and "too far", and what to do. */
export type DistanceGuide = { good: boolean; at: number; text: string }

export function GetSetChecklist({ items, distance }: { items: ChecklistItem[]; distance?: DistanceGuide | null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-[420px] border border-white/15 bg-black/60 px-4 py-3.5 text-left backdrop-blur"
    >
      <p className="text-[17px] font-medium tracking-[-0.01em]">Get set</p>
      <ul className="mt-2 grid gap-1.5">
        {items.map((item) => (
          <li key={item.label} className={`flex items-center gap-2.5 text-[15px] ${item.ok ? 'text-[#7ee0a3]' : 'text-white/75'}`}>
            <span
              aria-hidden="true"
              className={`grid size-[18px] shrink-0 place-items-center rounded-full border text-[11px] leading-none ${
                item.ok ? 'border-[#7ee0a3] bg-[#7ee0a3] text-black' : 'border-white/40'
              }`}
            >
              {item.ok ? '✓' : ''}
            </span>
            <span>
              {item.label}
              <span className="sr-only">{item.ok ? ' (done)' : ' (not yet)'}</span>
            </span>
          </li>
        ))}
      </ul>
      {distance && <DistanceMeter {...distance} />}
      <p className="mt-2.5 text-[12px] text-white/55">The countdown starts when all three are ticked</p>
    </div>
  )
}

/** A track from "too close" to "too far" with a green middle, and a dot for where you stand now. */
function DistanceMeter({ good, at, text }: DistanceGuide) {
  const color = good ? '#7ee0a3' : 'var(--accent)'
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div aria-hidden="true" className="flex justify-between text-[11px] tracking-[0.08em] text-white/50 uppercase">
        <span>Too close</span>
        <span>Good</span>
        <span>Too far</span>
      </div>
      <div aria-hidden="true" className="relative mt-1.5 h-2 rounded-full bg-white/12">
        <div className="absolute inset-y-0 right-[20%] left-[20%] rounded-full bg-[#7ee0a3]/35" />
        <div
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black transition-[left,background-color] duration-300 ease-out"
          style={{ left: `${Math.round(at * 100)}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-2 text-[17px] leading-snug font-medium tracking-[-0.01em]" style={{ color }}>
        {text}
      </p>
    </div>
  )
}
