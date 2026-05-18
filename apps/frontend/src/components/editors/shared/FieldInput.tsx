import { useState, useCallback, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface FieldInputProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  suggestions?: string[]
  placeholder?: string
}

export function FieldInput({ value, onChange, onBlur, suggestions = [], placeholder }: FieldInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = useCallback((suggestion: string) => {
    onChange(suggestion)
    setShowSuggestions(false)
    onBlur()
  }, [onChange, onBlur])

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => {
          onBlur()
          setTimeout(() => setShowSuggestions(false), 150)
        }}
        placeholder={placeholder}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              onMouseDown={() => handleSelect(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
