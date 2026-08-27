import { Link } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/TagInput'
import { difficultyLabel } from './render/difficultyLabel'
import type { Difficulty } from './render/difficulty'

/** Always dd.mm.yyyy, regardless of UI language. */
function formatCreatedAt(iso: string): string {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getFullYear()}`
}

interface PatternInfoSectionProps {
  title: string
  createdBy: string
  style: string[]
  notes: string
  sourceUrl: string
  /** Set as long as this pattern is a remix and the link to the original hasn't broken yet. */
  remixOf?: { title: string; slug: string } | null
  /** ISO timestamp; absent for a new, not-yet-saved pattern. */
  createdAt?: string
  /** Computed live from the current (even unsaved) turning sequence, see render/twist.ts. */
  isTwistNeutral: boolean
  /** Computed live from the current (even unsaved) threading/turning sequence, see render/difficulty.ts. */
  difficulty: Difficulty
  /** Style tags already used elsewhere, as autocomplete suggestions. */
  styleSuggestions?: string[]
  editable?: boolean
  onTitleChange?: (title: string) => void
  onStyleChange?: (style: string[]) => void
  onNotesChange?: (notes: string) => void
  onSourceUrlChange?: (sourceUrl: string) => void
}

/**
 * Pattern info (title, creator, style, notes, source, remix origin),
 * deliberately without a Card - just a plain text list below the color
 * picker. In the editor, title/style/notes/source are editable; creator
 * and remix origin are always read-only.
 */
export function PatternInfoSection({
  title,
  createdBy,
  style,
  notes,
  sourceUrl,
  remixOf,
  createdAt,
  isTwistNeutral,
  difficulty,
  styleSuggestions,
  editable = false,
  onTitleChange,
  onStyleChange,
  onNotesChange,
  onSourceUrlChange,
}: PatternInfoSectionProps) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col gap-3 text-sm">
      {editable && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pattern-title">{t('infoTitle')}</Label>
          <Input
            id="pattern-title"
            value={title}
            onChange={(e) => onTitleChange?.(e.target.value)}
            placeholder={t('infoTitlePlaceholder')}
          />
        </div>
      )}

      <div>
        <span className="block text-xs font-medium text-muted-foreground">{t('infoCreator')}</span>
        {createdBy ? (
          <Link to={`/profil/${createdBy}`} className="text-primary underline">
            {createdBy}
          </Link>
        ) : (
          <span>{t('deletedUserLabel')}</span>
        )}
      </div>

      {createdAt && (
        <div>
          <span className="block text-xs font-medium text-muted-foreground">{t('infoCreatedAt')}</span>
          <span>{formatCreatedAt(createdAt)}</span>
        </div>
      )}

      <div>
        <span className="block text-xs font-medium text-muted-foreground">{t('infoTwistNeutralLabel')}</span>
        <span>{isTwistNeutral ? t('twistNeutralYes') : t('twistNeutralNo')}</span>
      </div>

      <div>
        <span className="block text-xs font-medium text-muted-foreground">{t('infoDifficultyLabel')}</span>
        <span>{difficultyLabel(t, difficulty)}</span>
      </div>

      {remixOf && (
        <div>
          <span className="block text-xs font-medium text-muted-foreground">{t('infoRemixOf')}</span>
          <Link to={`/pattern/${remixOf.slug}`} className="text-primary underline">
            {remixOf.title}
          </Link>
        </div>
      )}

      {(editable || style.length > 0) && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pattern-style">{t('infoStyle')}</Label>
          {editable ? (
            <TagInput
              id="pattern-style"
              value={style}
              onChange={(next) => onStyleChange?.(next)}
              suggestions={styleSuggestions}
              placeholder={t('infoStylePlaceholder')}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {style.map((tag) => (
                <Link
                  key={tag}
                  to={`/pattern?style=${encodeURIComponent(tag)}`}
                  className="bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full px-2 py-0.5 text-xs"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {(editable || notes) && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pattern-notes">{t('infoNotes')}</Label>
          {editable ? (
            <Textarea id="pattern-notes" value={notes} onChange={(e) => onNotesChange?.(e.target.value)} />
          ) : (
            <p className="whitespace-pre-wrap">{notes}</p>
          )}
        </div>
      )}

      {(editable || sourceUrl) && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pattern-source">{t('infoSource')}</Label>
          {editable ? (
            <Input
              id="pattern-source"
              type="url"
              value={sourceUrl}
              onChange={(e) => onSourceUrlChange?.(e.target.value)}
              placeholder={t('infoSourcePlaceholder')}
            />
          ) : (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-primary underline"
            >
              {sourceUrl}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
