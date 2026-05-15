import { describe, it, expect } from 'vitest'
import { parseDAG, topologicalSort } from '../dag'
import type { WorkflowDefinition } from '@flowcraft/shared'

describe('WorkflowEngine integration', () => {
  it('should sort complex workflow into layers', () => {
    const wf: WorkflowDefinition = {
      name: 'complex',
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, config: {} },
        { id: 'llm-1', type: 'llm', position: { x: 200, y: 0 }, config: {} },
        { id: 'llm-2a', type: 'llm', position: { x: 400, y: -100 }, config: {} },
        { id: 'llm-2b', type: 'llm', position: { x: 400, y: 100 }, config: {} },
        { id: 'end', type: 'end', position: { x: 600, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'llm-1' },
        { id: 'e2', source: 'llm-1', target: 'llm-2a' },
        { id: 'e3', source: 'llm-1', target: 'llm-2b' },
        { id: 'e4', source: 'llm-2a', target: 'end' },
        { id: 'e5', source: 'llm-2b', target: 'end' },
      ],
    }
    const dag = parseDAG(wf)
    const layers = topologicalSort(dag)
    expect(layers[0]).toContain('start')
    expect(layers[1]).toContain('llm-1')
    expect(layers[2]).toContain('llm-2a')
    expect(layers[2]).toContain('llm-2b')
    expect(layers[3]).toContain('end')
  })

  it('should handle diamond dependency', () => {
    const wf: WorkflowDefinition = {
      name: 'diamond',
      nodes: [
        { id: 'a', type: 'start', position: { x: 0, y: 0 }, config: {} },
        { id: 'b', type: 'llm', position: { x: 200, y: -50 }, config: {} },
        { id: 'c', type: 'llm', position: { x: 200, y: 50 }, config: {} },
        { id: 'd', type: 'end', position: { x: 400, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'a', target: 'c' },
        { id: 'e3', source: 'b', target: 'd' },
        { id: 'e4', source: 'c', target: 'd' },
      ],
    }
    const layers = topologicalSort(parseDAG(wf))
    expect(layers[0]).toEqual(['a'])
    expect(new Set(layers[1])).toEqual(new Set(['b', 'c']))
    expect(layers[2]).toEqual(['d'])
  })

  it('should handle condition branch edge with sourceHandle', () => {
    const wf: WorkflowDefinition = {
      name: 'condition',
      nodes: [
        { id: 'start', type: 'start', position: { x: 0, y: 0 }, config: {} },
        { id: 'cond', type: 'condition', position: { x: 200, y: 0 }, config: { expression: 'score > 80' } },
        { id: 'pass', type: 'llm', position: { x: 400, y: -50 }, config: {} },
        { id: 'fail', type: 'llm', position: { x: 400, y: 50 }, config: {} },
        { id: 'end', type: 'end', position: { x: 600, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'cond' },
        { id: 'e2', source: 'cond', target: 'pass', sourceHandle: 'true' },
        { id: 'e3', source: 'cond', target: 'fail', sourceHandle: 'false' },
        { id: 'e4', source: 'pass', target: 'end' },
        { id: 'e5', source: 'fail', target: 'end' },
      ],
    }
    const dag = parseDAG(wf)
    const edges = dag.getIncomingEdges('pass')
    expect(edges[0].sourceHandle).toBe('true')
    const failEdges = dag.getIncomingEdges('fail')
    expect(failEdges[0].sourceHandle).toBe('false')
  })

  it('should reject disconnected edge references', () => {
    const wf: WorkflowDefinition = {
      name: 'bad-edge',
      nodes: [{ id: 'a', type: 'start', position: { x: 0, y: 0 }, config: {} }],
      edges: [{ id: 'e1', source: 'a', target: 'ghost' }],
    }
    expect(() => parseDAG(wf)).toThrow('missing node')
  })

  it('should handle 3-node cycle', () => {
    const wf: WorkflowDefinition = {
      name: '3-cycle',
      nodes: [
        { id: 'a', type: 'llm', position: { x: 0, y: 0 }, config: {} },
        { id: 'b', type: 'llm', position: { x: 200, y: 0 }, config: {} },
        { id: 'c', type: 'llm', position: { x: 400, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'b', target: 'c' },
        { id: 'e3', source: 'c', target: 'a' },
      ],
    }
    expect(() => parseDAG(wf)).toThrow('Cycle detected')
  })
})
