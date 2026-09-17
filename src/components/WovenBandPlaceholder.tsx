interface WovenBandPlaceholderProps {
  className?: string
  /** Short note on what the eventual real photo would show (e.g. "Workshop setup") - shown as a small pill overlay. */
  caption?: string | null
}

/** Warm woven-band placeholder for content without a real image yet (e.g. article covers). */
export function WovenBandPlaceholder({ className = '', caption }: WovenBandPlaceholderProps) {
  return (
    <div
      className={`bg-muted relative flex items-center justify-center rounded-lg bg-[repeating-linear-gradient(115deg,var(--primary)_0px,var(--primary)_10px,transparent_10px,transparent_20px)] opacity-90 ${className}`}
    >
      {caption && (
        <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
          {caption}
        </span>
      )}
    </div>
  )
}
