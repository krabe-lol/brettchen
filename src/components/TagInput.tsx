import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/features/i18n/LanguageContext'
import { cn } from '@/lib/utils'

interface TagInputProps {
  id?: string
  value: string[]
  onChange: (tags: string[]) => void
  /** Existing tags from other patterns, shown as autocomplete suggestions below the input. */
  suggestions?: string[]
  placeholder?: string
  className?: string
  /** Merged into the bordered input box itself (not the outer wrapper) - e.g. to flatten a corner when attaching a button group, see PatternFilterBar. */
  inputClassName?: string
}

/**
 * Free-text tag input: Enter adds the current text as a new tag
 * (case-insensitive dedup against existing tags), Backspace on an empty
 * input removes the last tag. Shows an autocomplete dropdown of matching,
 * not-yet-added `suggestions` below the field - clicking one adds it too.
 */
export function TagInput({ id, value, onChange, suggestions = [], placeholder, className, inputClassName }: TagInputProps) {
  const { t } = useLanguage()
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  /** -1 = no suggestion highlighted (Enter then adds the typed text as-is). */
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const filteredSuggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    return suggestions
      .filter((suggestion) => !value.some((tag) => tag.toLowerCase() === suggestion.toLowerCase()))
      .filter((suggestion) => query === '' || suggestion.toLowerCase().includes(query))
      .slice(0, 8)
  }, [suggestions, value, inputValue])

  // Typing or opening/closing the dropdown drops any prior arrow-key selection.
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [inputValue, isOpen])

  useEffect(() => {
    if (highlightedIndex >= 0) suggestionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag) return
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setInputValue('')
      return
    }
    onChange([...value, tag])
    setInputValue('')
  }

  function removeTag(tag: string) {
    onChange(value.filter((existing) => existing !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && isOpen && filteredSuggestions.length > 0) {
      e.preventDefault()
      setHighlightedIndex((i) => (i + 1) % filteredSuggestions.length)
    } else if (e.key === 'ArrowUp' && isOpen && filteredSuggestions.length > 0) {
      e.preventDefault()
      setHighlightedIndex((i) => (i <= 0 ? filteredSuggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const highlighted = filteredSuggestions[highlightedIndex]
      addTag(highlighted ?? inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        className={cn(
          'border-input focus-within:border-ring focus-within:ring-ring/50 flex flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2 py-1.5 focus-within:ring-[3px]',
          inputClassName,
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="bg-muted text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={t('tagRemoveLabel', { tag })}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : undefined}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <div className="bg-popover text-popover-foreground absolute top-full left-0 z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border p-1 shadow-md">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              ref={(el) => {
                suggestionRefs.current[index] = el
              }}
              type="button"
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault()
                addTag(suggestion)
              }}
              className={cn(
                'block w-full rounded px-2 py-1 text-left text-sm',
                index === highlightedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
