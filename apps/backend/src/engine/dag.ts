import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '@flowcraft/shared'

export interface DAGNode {
  id: string
  type: string
  config: Record<string, unknown>
  parents: string[]
  children: string[]
  incomingEdges: WorkflowEdge[]
}

export class DAG {
  readonly nodes = new Map<string, DAGNode>()

  addNode(node: WorkflowNode): void {
    this.nodes.set(node.id, {
      id: node.id,
      type: node.type,
      config: node.config,
      parents: [],
      children: [],
      incomingEdges: [],
    })
  }

  addEdge(edge: WorkflowEdge): void {
    const source = this.nodes.get(edge.source)
    const target = this.nodes.get(edge.target)
    if (!source || !target) {
      throw new Error(`Edge references missing node: ${edge.source} -> ${edge.target}`)
    }
    source.children.push(edge.target)
    target.parents.push(edge.source)
    target.incomingEdges.push(edge)
  }

  getChildren(id: string): string[] {
    return this.nodes.get(id)?.children || []
  }

  getParents(id: string): string[] {
    return this.nodes.get(id)?.parents || []
  }

  getIncomingEdges(id: string): WorkflowEdge[] {
    return this.nodes.get(id)?.incomingEdges || []
  }
}

export function parseDAG(workflow: WorkflowDefinition): DAG {
  const dag = new DAG()
  for (const node of workflow.nodes) dag.addNode(node)
  for (const edge of workflow.edges) dag.addEdge(edge)

  const visited = new Set<string>()
  const inStack = new Set<string>()

  function dfs(id: string) {
    if (inStack.has(id)) throw new Error(`Cycle detected at node: ${id}`)
    if (visited.has(id)) return
    visited.add(id)
    inStack.add(id)
    for (const child of dag.getChildren(id)) dfs(child)
    inStack.delete(id)
  }

  for (const node of workflow.nodes) {
    if (!visited.has(node.id)) dfs(node.id)
  }

  return dag
}

export function topologicalSort(dag: DAG): string[][] {
  const layers: string[][] = []
  const remaining = new Set(dag.nodes.keys())
  const completed = new Set<string>()

  while (remaining.size > 0) {
    const layer: string[] = []
    for (const id of remaining) {
      if (dag.getParents(id).every(p => completed.has(p))) layer.push(id)
    }
    if (layer.length === 0) throw new Error('Cannot resolve remaining nodes — possible cycle')
    for (const id of layer) {
      remaining.delete(id)
      completed.add(id)
    }
    layers.push(layer)
  }

  return layers
}
