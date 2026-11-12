export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M3 11 L11 3 M5 3 H11 V9" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
