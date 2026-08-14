import { PatternThumbnail } from '@/features/pattern-viewer/PatternThumbnail'
import type { StrapiPatternRecord } from '@/lib/strapi/patterns'

interface CollectionThumbnailProps {
  patterns: StrapiPatternRecord[]
  className?: string
}

/** How many patterns to show in the thumbnail: 1→1, 2-3→2, 4+→4. */
function shownCount(total: number): 0 | 1 | 2 | 4 {
  if (total <= 0) return 0
  if (total === 1) return 1
  if (total <= 3) return 2
  return 4
}

/**
 * Collection preview built from the same PatternThumbnail tiles as a single
 * pattern card: 1 pattern fills the area, 2-3 show the first two
 * side by side, 4+ show a 2x2 grid.
 */
export function CollectionThumbnail({ patterns, className }: CollectionThumbnailProps) {
  const count = shownCount(patterns.length)

  if (count === 0) {
    return <div className={className + ' bg-muted'} />
  }

  if (count === 1) {
    const pattern = patterns[0]
    return (
      <PatternThumbnail
        pattern={pattern}
        palette={pattern.defaultPalette}
        weftColorSlotId={pattern.weftColorSlot}
        className={className}
      />
    )
  }

  return (
    <div className={`${className} grid grid-cols-2 gap-px overflow-hidden bg-border`} style={{ gridAutoRows: '1fr' }}>
      {patterns.slice(0, count).map((pattern) => (
        <PatternThumbnail
          key={pattern.documentId}
          pattern={pattern}
          palette={pattern.defaultPalette}
          weftColorSlotId={pattern.weftColorSlot}
          className="h-full w-full"
        />
      ))}
    </div>
  )
}
