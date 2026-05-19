import { NODE_TYPE_META, type NodeType } from '@flowcraft/shared'
import {
  PlayCircle,
  Square,
  Bot,
  GitBranch,
  Code,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNodeColor } from '@/lib/node-theme'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'PlayCircle': PlayCircle,
  'Square': Square,
  'bot': Bot,
  'git-branch': GitBranch,
  'code': Code,
  'globe': Globe,
}

interface NodePaletteProps {
  onAddNode?: (type: NodeType) => void
  aiMode?: 'simple' | 'advanced'
}

const nodeTypes = Object.keys(NODE_TYPE_META) as NodeType[]

export function NodePalette({ onAddNode, aiMode = 'simple' }: NodePaletteProps) {
  function handleDragStart(e: React.DragEvent, type: NodeType) {
    e.dataTransfer.setData('application/reactflow', type)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleClick(type: NodeType) {
    onAddNode?.(type)
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Nodes
      </h3>
      {nodeTypes.map((type) => {
        const meta = NODE_TYPE_META[type]
        const Icon = ICON_MAP[meta.icon] ?? Code
        const label = meta.label
        const colors = getNodeColor(type)
        const isFiltered = aiMode === 'simple' && type === 'code'

        return (
          <div
            key={type}
            title={meta.description}
            draggable={!isFiltered}
            onDragStart={(e) => handleDragStart(e, type)}
            onClick={() => !isFiltered && handleClick(type)}
            className={cn(
              'group relative flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-neutral-700 transition-colors',
              isFiltered
                ? 'cursor-not-allowed opacity-30'
                : 'cursor-grab hover:border-neutral-200 active:cursor-grabbing',
              !isFiltered && `hover:${colors.bg}`,
              meta.color
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {isFiltered && (
              <span className="ml-auto text-[10px] text-neutral-400">高级模式</span>
            )}
            {!isFiltered && (
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {meta.description}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-800" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
