import LeftfacingScard from './tabletOrientationArt/LeftfacingScard'
import LeftfacingZcard from './tabletOrientationArt/LeftfacingZcard'
import RightfacingScard from './tabletOrientationArt/RightfacingScard'
import RightfacingZcard from './tabletOrientationArt/RightfacingZcard'
import { useDisplaySettings } from './DisplaySettingsContext'
import { applyHoleLabelDirection, applyHoleLabelNotation } from './render/orientationDisplay'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const DIAGRAMS_BY_FACING = {
  left: { S: LeftfacingScard, Z: LeftfacingZcard },
  right: { S: RightfacingScard, Z: RightfacingZcard },
} as const

const ORIENTATIONS = ['S', 'Z'] as const
const BASE_LETTERS = ['A', 'B', 'C', 'D'] as const

/**
 * Legende neben der Schärpatrone: zeigt, wie ein S- bzw. Z-Brettchen gefädelt
 * ist (Kartenstellung, Fadenverlauf, Lochbeschriftung) – passend zur
 * aktuellen Beschriftungsrichtung (siehe DisplaySettings.holeLabelFacing),
 * damit die Buchstaben in der Grafik zu denen in der Schärpatrone passen.
 * Klein als Vorschau, vergrößert sich per Klick in einem Dialog. Als
 * Inline-SVG-Komponenten (nicht `<img>`) eingebunden, damit `var(--background)`/
 * `var(--foreground)` in den Grafiken den aktuellen Hell-/Dunkel-Modus der
 * Seite übernehmen – ein extern per `<img>` geladenes SVG bekäme diese
 * CSS-Variablen nicht mit.
 */
export function TabletOrientationLegend() {
  const { t } = useLanguage()
  const { settings } = useDisplaySettings()
  const diagrams = DIAGRAMS_BY_FACING[settings.holeLabelFacing]
  const labels = BASE_LETTERS.map((letter) =>
    applyHoleLabelNotation(
      applyHoleLabelDirection(letter, settings.holeLabelDirection, settings.holeLabelNotation),
      settings.holeLabelNotation,
    ),
  ) as [string, string, string, string]

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{t('orientationLegendHeading')}</h3>
      <div className="flex gap-3">
        {ORIENTATIONS.map((orientation) => {
          const label = t(orientation === 'S' ? 'orientationLegendSCard' : 'orientationLegendZCard')
          const Diagram = diagrams[orientation]
          return (
            <Dialog key={orientation}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="w-20 shrink-0 cursor-zoom-in rounded border p-1 bg-(--theme) hover:bg-accent"
                  aria-label={label}
                >
                  <Diagram className="w-full" role="img" aria-label={label} displaySettings={settings} labels={labels} />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-xs bg-(--theme)">
                <DialogTitle className="sr-only">{label}</DialogTitle>
                <Diagram className="w-full" role="img" aria-label={label} displaySettings={settings} labels={labels} />
              </DialogContent>
            </Dialog>
          )
        })}
      </div>
    </div>
  )
}
