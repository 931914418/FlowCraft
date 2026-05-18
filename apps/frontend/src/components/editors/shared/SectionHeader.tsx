interface SectionHeaderProps {
  title: string
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
      {title}
    </div>
  )
}
