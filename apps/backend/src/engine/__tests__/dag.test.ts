import { describe, it, expect } from 'vitest'
import { parseDAG, topologicalSort } from '../dag'
import type { WorkflowDefinition } from '@flowcraft/shared'

const linearWorkflow: WorkflowDefinition = {
  name: 'linear',
  nodes: [
    { id: 'start', type: 'start', position: { x: 0, y: 0 }, config: {} },
    { id: 'llm-1', type: 'llm', position: { x: 200, y: 0 }, config: { model: 'gpt-4o', prompt: 'hello' } },
    { id: 'end', type: 'end', position: { x: 400, y: 0 }, config: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'llm-1' },
    { id: 'e2', source: 'llm-1', target: 'end' },
  ],
}

const parallelWorkflow: WorkflowDefinition = {
  name: 'parallel',
  nodes: [
    { id: 'start', type: 'start', position: { x: 0, y: 0 }, config: {} },
    { id: 'llm-1', type: 'llm', position: { x: 200, y: -100 }, config: {} },
    { id: 'llm-2', type: 'llm', position: { x: 200, y: 100 }, config: {} },
    { id: 'merge', type: 'end', position: { x: 400, y: 0 }, config: {} },
    { id: 'end', type: 'end', position: { x: 600, y: 0 }, config: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'llm-1' },
    { id: 'e2', source: 'start', target: 'llm-2' },
    { id: 'e3', source: 'llm-1', target: 'merge' },
    { id: 'e4', source: 'llm-2', target: 'merge' },
    { id: 'e5', source: 'merge', target: 'end' },
  ],
}

describe('parseDAG', () => {
  it('should parse linear workflow', () => {
    const dag = parseDAG(linearWorkflow)
    expect(dag.nodes.size).toBe(3)
    expect(dag.getChildren('start')).toEqual(['llm-1'])
    expect(dag.getParents('llm-1')).toEqual(['start'])
  })

  it('should detect cycle', () => {
    const cyclic: WorkflowDefinition = {
      name: 'cyclic',
      nodes: [
        { id: 'a', type: 'llm', position: { x: 0, y: 0 }, config: {} },
        { id: 'b', type: 'llm', position: { x: 200, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'a' },
      ],
    }
    expect(() => parseDAG(cyclic)).toThrow('Cycle detected')
  })

  it('should detect self-loop', () => {
    const selfLoop: WorkflowDefinition = {
      name: 'self-loop',
      nodes: [
        { id: 'a', type: 'llm', position: { x: 0, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'a' },
      ],
    }
    expect(() => parseDAG(selfLoop)).toThrow('Cycle detected')
  })

  it('should reject edge to non-existent node', () => {
    const bad: WorkflowDefinition = {
      name: 'bad',
      nodes: [{ id: 'a', type: 'llm', position: { x: 0, y: 0 }, config: {} }],
      edges: [{ id: 'e1', source: 'a', target: 'nonexistent' }],
    }
    expect(() => parseDAG(bad)).toThrow('missing node')
  })

  it('should handle empty workflow', () => {
    const empty: WorkflowDefinition = { name: 'empty', nodes: [], edges: [] }
    const dag = parseDAG(empty)
    expect(dag.nodes.size).toBe(0)
  })
})

describe('topologicalSort', () => {
  it('should sort linear into layers', () => {
    const dag = parseDAG(linearWorkflow)
    const layers = topologicalSort(dag)
    expect(layers[0]).toContain('start')
    expect(layers[1]).toContain('llm-1')
    expect(layers[2]).toContain('end')
  })

  it('should sort parallel into layers', () => {
    const dag = parseDAG(parallelWorkflow)
    const layers = topologicalSort(dag)
    expect(layers[1]).toContain('llm-1')
    expect(layers[1]).toContain('llm-2')
    expect(layers[2]).toContain('merge')
  })

  it('should handle single node', () => {
    const dag = parseDAG({ name: 'single', nodes: [{ id: 'a', type: 'start', position: { x: 0, y: 0 }, config: {} }], edges: [] })
    const layers = topologicalSort(dag)
    expect(layers).toEqual([['a']])
  })
})
