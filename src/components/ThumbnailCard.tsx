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
  /** Shows the private/lock badge next to the title (shared look for pattern and collection cards). */
  isPrivate?: boolean
  /** Extra badges next to the title, e.g. the "(default)" marker on a collection. */
  titleBadges?: ReactNode
  /** Overlay button top-right on the thumbnail - "add to collection" for patterns, "subscribe" for collections. */
  cornerAction?: ReactNode
  /** Creator/owner username, right below the title, links to their public profile. */
  ownerUsername?: string
  /** Line below the title (style for patterns, description for collections). */
  subtitle?: ReactNode
  /** Extra line below that (e.g. a collection's pattern count). */
  footer?: ReactNode
  className?: string
}

/**
 * Shared card with a fixed 3:1 thumbnail for pattern and collection
 * overviews - PatternCard and CollectionCard only differ in thumbnail
 * content and overlay actions.
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
