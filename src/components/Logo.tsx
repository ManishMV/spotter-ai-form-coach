// Spotter mark: a squatting figure drawn like a pose-tracking skeleton, with the hip and knee
// joints in Spotter orange. Uses currentColor, so it's black on light pages and white on dark ones.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="12" cy="4.5" r="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M11 9 L8 16 L17 19 L13 26 M10 11 L19 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="8" cy="16" r="2.4" fill="var(--accent)" />
      <circle cx="17" cy="19" r="2.4" fill="var(--accent)" />
    </svg>
  )
}

/** With `onHome`, the logo is a button back to the home page (the usual web convention). */
export function Logo({ onHome }: { onHome?: () => void }) {
  const content = (
    <>
      <LogoMark />
      <span className="text-[19px] font-medium tracking-[-0.02em]">Spotter</span>
      <span className="label hidden text-faint sm:inline">AI Form Coach</span>
    </>
  )
  if (!onHome) return <div className="flex items-center gap-2.5">{content}</div>
  return (
    <button onClick={onHome} aria-label="Spotter home" className="press -ml-2 flex h-11 items-center gap-2.5 px-2 hover:opacity-80">
      {content}
    </button>
  )
}
