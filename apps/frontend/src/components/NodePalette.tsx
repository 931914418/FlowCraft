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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'PlayCircle': PlayCircle,
  'Square': Square,
  'bot': Bot,
  'git-branch': GitBranch,
  'code': Code,
  'globe': Globe,
}

const LABEL_MAP: Record<string, string> = {
  start: 'Start',
  end: 'End',
  llm: 'LLM',
  condition: 'Condition',
  code: 'Code',
  http: 'HTTP',
}

interface NodePaletteProps {
  onAddNode?: (type: NodeType) => void
}

const nodeTypes = Object.keys(NODE_TYPE_META) as NodeType[]

export function NodePalette({ onAddNode }: NodePaletteProps) {
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
        const label = LABEL_MAP[type] ?? meta.label

        return (
          <div
            key={type}
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            onClick={() => handleClick(type)}
            className={cn(
              'flex cursor-grab items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:border-neutral-200 active:cursor-grabbing',
              meta.color
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
