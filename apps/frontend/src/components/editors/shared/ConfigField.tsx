import type { ReactNode } from 'react'

interface ConfigFieldProps {
  label: string
  children: ReactNode
  hint?: string
}

export function ConfigField({ label, children, hint }: ConfigFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
