const NODE_COLORS = {
    start: { accent: 'bg-green-500', bg: 'bg-green-50', border: 'border-green-400', dot: 'bg-green-500', ring: 'ring-green-500' },
    end: { accent: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-400', dot: 'bg-red-500', ring: 'ring-red-500' },
    llm: { accent: 'bg-violet-500', bg: 'bg-violet-50', border: 'border-violet-400', dot: 'bg-violet-500', ring: 'ring-violet-500' },
    condition: { accent: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-400', dot: 'bg-amber-500', ring: 'ring-amber-500' },
    code: { accent: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-400', dot: 'bg-emerald-500', ring: 'ring-emerald-500' },
    http: { accent: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-400', dot: 'bg-blue-500', ring: 'ring-blue-500' },
    'data-mapper': { accent: 'bg-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-400', dot: 'bg-cyan-500', ring: 'ring-cyan-500' },
    'ai-processor': { accent: 'bg-purple-500', bg: 'bg-purple-50', border: 'border-purple-400', dot: 'bg-purple-500', ring: 'ring-purple-500' },
};
const DEFAULT_COLORS = { accent: 'bg-slate-500', bg: 'bg-slate-50', border: 'border-slate-400', dot: 'bg-slate-500', ring: 'ring-slate-500' };
export function getNodeColor(nodeType) {
    return NODE_COLORS[nodeType] ?? DEFAULT_COLORS;
}
export function getNodeAccentBarClass(nodeType) {
    return getNodeColor(nodeType).accent;
}
