// "Get set": before the countdown, the three things Spotter needs, ticking green as it sees each one.
// Replaces a single prompt line, so people see exactly what's missing and that the count starts on "Go".
export type ChecklistItem = { label: string; ok: boolean }

export function GetSetChecklist({ items }: { items: ChecklistItem[] }) {
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
      <p className="mt-2.5 text-[12px] text-white/55">The countdown starts when all three are ticked</p>
    </div>
  )
}
