import { resolveMediaUrl, type StrapiArticleRecord } from '@/lib/strapi/articles'
import { WovenBandPlaceholder } from '@/components/WovenBandPlaceholder'

interface ArticleCoverImageProps {
  article: Pick<StrapiArticleRecord, 'coverImage' | 'imageCaption' | 'title'>
  className?: string
}

/** Real cover photo once one's uploaded, otherwise the woven-band placeholder with its caption. */
export function ArticleCoverImage({ article, className }: ArticleCoverImageProps) {
  if (article.coverImage) {
    return (
      <img
        src={resolveMediaUrl(article.coverImage.url)}
        alt={article.imageCaption ?? article.title}
        className={`object-cover ${className ?? ''}`}
      />
    )
  }
  return <WovenBandPlaceholder caption={article.imageCaption} className={className} />
}
