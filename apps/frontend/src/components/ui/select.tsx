import { cn } from '@/lib/utils'

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  children: React.ReactNode
}

function Select({ value, onValueChange, placeholder, children, className, onBlur, ...props }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => {
        onValueChange?.(e.target.value)
        // Trigger blur handler on change so config saves immediately
        if (onBlur) {
          onBlur({ target: e.target, type: 'change' } as unknown as React.FocusEvent<HTMLSelectElement>)
        }
      }}
      className={cn(
        'flex h-9 w-full rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onBlur={onBlur}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {children}
    </select>
  )
}

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  value: string
  children: React.ReactNode
}

function SelectItem({ value, children, ...props }: SelectItemProps) {
  return (
    <option value={value} {...props}>
      {children}
    </option>
  )
}

export { Select, SelectItem }
