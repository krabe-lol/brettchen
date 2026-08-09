import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ThumbnailCardProps {
  href: string
  thumbnail: ReactNode
  title: string
  /** Zeigt das Privat/Schloss-Badge neben dem Titel (gemeinsames Aussehen für Muster- und Sammlungskarten). */
  isPrivate?: boolean
  /** Weitere Badges neben dem Titel, z. B. die "(Standard)"-Markierung einer Sammlung. */
  titleBadges?: ReactNode
  /** Overlay-Button oben rechts auf dem Thumbnail – bei Mustern "zu Sammlung hinzufügen", bei Sammlungen "Abonnieren". */
  cornerAction?: ReactNode
  /** Ersteller-/Besitzer-Benutzername, direkt unter dem Titel, verlinkt zum öffentlichen Profil. */
  ownerUsername?: string
  /** Zeile unter dem Titel (Stil bei Mustern, Beschreibung bei Sammlungen). */
  subtitle?: ReactNode
  /** Zusätzliche Zeile darunter (z. B. Musteranzahl einer Sammlung). */
  footer?: ReactNode
  className?: string
}

/**
 * Gemeinsame Karte mit Vorschaubild (fest 3:1) für Muster- und
 * Sammlungsübersichten – PatternCard und CollectionCard unterscheiden sich
 * nur im Thumbnail-Inhalt und den Overlay-Aktionen.
 */
export function ThumbnailCard({
  href,
  thumbnail,
  title,
  isPrivate,
  titleBadges,
  cornerAction,
  ownerUsername,
  subtitle,
  footer,
  className,
}: ThumbnailCardProps) {
  const { t } = useLanguage()

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      <div className="relative">
        <Link to={href}>{thumbnail}</Link>
        {cornerAction && <div className="absolute top-2 right-2">{cornerAction}</div>}
      </div>
      <div className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2">
          <Link to={href} className="font-medium hover:underline">
            {title}
          </Link>
          {isPrivate && (
            <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              <Lock className="size-3" />
              {t('profileDraft')}
            </span>
          )}
          {titleBadges}
        </div>
        {ownerUsername && (
          <Link to={`/profil/${ownerUsername}`} className="text-xs text-muted-foreground hover:underline">
            {ownerUsername}
          </Link>
        )}
        {subtitle}
        {footer}
      </div>
    </Card>
  )
}
