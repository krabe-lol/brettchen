/** Warm woven-band placeholder for content without a real image yet (e.g. article covers). */
export function WovenBandPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-muted flex items-end rounded-lg bg-[repeating-linear-gradient(115deg,var(--primary)_0px,var(--primary)_10px,transparent_10px,transparent_20px)] opacity-90 ${className}`}
    />
  )
}
