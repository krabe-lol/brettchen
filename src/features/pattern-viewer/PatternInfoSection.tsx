import { Link } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TagInput } from '@/components/TagInput'

/** Immer dd.mm.yyyy, unabhängig von der UI-Sprache. */
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
  /** Gesetzt, solange dieses Muster ein Remix ist und der Link zum Original noch nicht gebrochen ist. */
  remixOf?: { title: string; slug: string } | null
  /** ISO-Zeitstempel; fehlt bei einem noch nicht gespeicherten neuen Muster. */
  createdAt?: string
  /** Live aus der aktuellen (auch ungespeicherten) Wendefolge berechnet, siehe render/twist.ts. */
  isTwistNeutral: boolean
  /** Bereits anderswo verwendete Stil-Tags, als Autocomplete-Vorschläge. */
  styleSuggestions?: string[]
  editable?: boolean
  onTitleChange?: (title: string) => void
  onStyleChange?: (style: string[]) => void
  onNotesChange?: (notes: string) => void
  onSourceUrlChange?: (sourceUrl: string) => void
}

/**
 * Informationen zum Muster (Titel, Ersteller, Stil, Freitext, Quelle,
 * Remix-Herkunft), bewusst ohne Card – nur eine schlichte Textliste unter
 * der Farbwahl. Im Editor sind Titel, Stil, Freitext und Quelle bearbeitbar,
 * der Ersteller und die Remix-Herkunft sind immer nur Anzeige.
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
          <span>{createdBy}</span>
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
                  className="bg-muted hover:bg-accent hover:text-accent-foreground rounded-full px-2 py-0.5 text-xs"
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
