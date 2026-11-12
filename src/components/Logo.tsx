// Spotter mark: a bent leg (hip–knee–ankle) like a pose-tracking skeleton, in an orange square.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" fill="var(--accent)" />
      <path d="M8 7 L18 15 L11 22" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="8" cy="7" r="2.4" fill="#fff" />
      <circle cx="18" cy="15" r="2.4" fill="#fff" />
      <circle cx="11" cy="22" r="2.4" fill="#fff" />
    </svg>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[19px] font-medium tracking-[-0.02em]">Spotter</span>
      <span className="label hidden text-faint sm:inline">AI Form Coach</span>
    </div>
  )
}
