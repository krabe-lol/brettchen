import { PatternThumbnail } from '@/features/pattern-viewer/PatternThumbnail'
import type { StrapiPatternRecord } from '@/lib/strapi/patterns'

interface CollectionThumbnailProps {
  patterns: StrapiPatternRecord[]
  className?: string
}

/** Wie viele Muster im Thumbnail gezeigt werden: 1→1, 2–3→2, 4+→4. */
function shownCount(total: number): 0 | 1 | 2 | 4 {
  if (total <= 0) return 0
  if (total === 1) return 1
  if (total <= 3) return 2
  return 4
}

/**
 * Sammlungs-Vorschau, aus denselben PatternThumbnail-Kacheln zusammengesetzt
 * wie die einzelne Musterkarte: 1 Muster füllt die volle Fläche, 2–3 Muster
 * zeigen die ersten beiden nebeneinander, ab 4 Mustern ein 2×2-Raster.
 */
export function CollectionThumbnail({ patterns, className }: CollectionThumbnailProps) {
  const count = shownCount(patterns.length)

  if (count === 0) {
    return <div className={className + ' bg-muted'} />
  }

  if (count === 1) {
    const pattern = patterns[0]
    return <PatternThumbnail pattern={pattern} palette={pattern.defaultPalette} className={className} />
  }

  return (
    <div className={`${className} grid grid-cols-2 gap-px overflow-hidden bg-border`} style={{ gridAutoRows: '1fr' }}>
      {patterns.slice(0, count).map((pattern) => (
        <PatternThumbnail
          key={pattern.documentId}
          pattern={pattern}
          palette={pattern.defaultPalette}
          className="h-full w-full"
        />
      ))}
    </div>
  )
}
