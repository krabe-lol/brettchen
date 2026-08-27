import { CheckCheck, Download, Globe, Lock, Trash, X } from 'lucide-react'
import { BulkAddToCollectionButton } from './BulkAddToCollectionButton'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Button } from '@/components/ui/button'
import type { StrapiCollectionRecord } from '@/lib/strapi/collections'

interface PatternBulkActionsBarProps {
  count: number
  onClearSelection: () => void
  /** Adds every currently filtered/visible pattern to the selection. */
  onSelectAll: () => void
  onExportAll: () => void
  /** Add-to-collection is only offered when logged in with collections already loaded, same precondition as the per-card bookmark button. */
  collections?: StrapiCollectionRecord[]
  patternIds: string[]
  token?: string | null
  onCollectionsChanged?: () => void
  /** Omitted entirely on pages where bulk delete doesn't make sense (patterns not owned by the viewer), see MyPatternListPage vs. PatternListPage. */
  onDeleteAll?: () => void
  isDeleting?: boolean
  /** Publish/draft toggle - same ownership restriction as onDeleteAll, so always set together (MyPatternListPage only). */
  onPublishAll?: () => void
  onSetDraftAll?: () => void
  /** Which visibility change (if any) is in flight - disables both buttons and relabels whichever was clicked. */
  visibilityAction?: 'draft' | 'published' | null
}

/** Shown above the pattern grid once 1+ cards are checked (see usePatternSelection/PatternCard). */
export function PatternBulkActionsBar({
  count,
  onClearSelection,
  onSelectAll,
  onExportAll,
  collections,
  patternIds,
  token,
  onCollectionsChanged,
  onDeleteAll,
  isDeleting,
  onPublishAll,
  onSetDraftAll,
  visibilityAction,
}: PatternBulkActionsBarProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
      <span className="text-sm font-medium">{t('patternBulkSelectedCount', { count: String(count) })}</span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onSelectAll}>
          <CheckCheck />
          {t('patternBulkSelectAll')}
        </Button>
        <Button type="button" variant="outline" onClick={onExportAll}>
          <Download />
          {t('patternBulkExportAll')}
        </Button>
        {collections && token && onCollectionsChanged && (
          <BulkAddToCollectionButton
            collections={collections}
            patternIds={patternIds}
            token={token}
            onChanged={onCollectionsChanged}
          />
        )}
        {onPublishAll && onSetDraftAll && (
          <>
            <Button type="button" variant="outline" onClick={onPublishAll} disabled={Boolean(visibilityAction)}>
              <Globe />
              {visibilityAction === 'published' ? t('patternBulkChangingVisibility') : t('patternBulkPublishAll')}
            </Button>
            <Button type="button" variant="outline" onClick={onSetDraftAll} disabled={Boolean(visibilityAction)}>
              <Lock />
              {visibilityAction === 'draft' ? t('patternBulkChangingVisibility') : t('patternBulkSetDraftAll')}
            </Button>
          </>
        )}
        {onDeleteAll && (
          <Button type="button" variant="destructive" onClick={onDeleteAll} disabled={isDeleting}>
            <Trash />
            {isDeleting ? t('patternBulkDeleting') : t('patternBulkDeleteAll')}
          </Button>
        )}
      </div>
      <Button type="button" variant="ghost" size="icon" className="ml-auto" onClick={onClearSelection} aria-label={t('patternBulkClearSelection')}>
        <X />
      </Button>
    </div>
  )
}
