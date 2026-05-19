import * as React from 'react'
import { cn } from '@/lib/utils'

// 原生 select 包装（供 SettingsSidebar 使用）
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

// Radix 风格的复合组件（供 SettingsPage 使用）
// 这些是轻量包装，内部仍使用原生 select

function SelectTrigger({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  // 在原生 select 模式下，值由 Select 控制，这里仅作为占位
  return <span className="text-neutral-400">{placeholder}</span>
}

function SelectContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // 原生 select 模式下不需要实际渲染，但保留结构以避免 TS 错误
  return (
    <div className={cn('rounded-md border border-neutral-200 bg-white py-1 shadow-md', className)} {...props}>
      {children}
    </div>
  )
}

export { Select, SelectItem, SelectContent, SelectTrigger, SelectValue }
