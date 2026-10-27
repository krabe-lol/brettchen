import { HexColorInput, HexColorPicker } from 'react-colorful'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ColorSwatchPickerProps {
  value: string
  onChange: (hex: string) => void
  /** Accessible name of the swatch button, e.g. "Change Color 1". */
  label: string
}

/**
 * Color swatch that opens the same gradient picker (react-colorful) as
 * BasicColorPicker, plus a hex field. Replaces the native
 * `<input type="color">`, whose browser/OS dialog can't be styled and lays
 * its hue bar out differently (red-orange on the right in Chrome) - this
 * way every color picker in the app looks and reads the same. Changes
 * apply live while dragging, like the native input's onChange did.
 */
export function ColorSwatchPicker({ value, onChange, label }: ColorSwatchPickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={label}
        title={label}
        className="size-6 shrink-0 cursor-pointer rounded border"
        style={{ backgroundColor: value }}
      />
      <PopoverContent className="flex w-56 flex-col gap-2">
        <HexColorPicker color={value} onChange={onChange} className="!w-full" />
        <HexColorInput
          color={value}
          onChange={onChange}
          prefixed
          className={cn(
            'h-8 w-full rounded-md border border-input bg-transparent px-2 font-mono text-sm uppercase outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          )}
        />
      </PopoverContent>
    </Popover>
  )
}
