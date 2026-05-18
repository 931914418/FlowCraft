import { describe, it, expect } from 'vitest'
import { renderTemplate } from '../executors'
import type { ExecutionContext } from '../executors'

describe('renderTemplate', () => {
  const context: ExecutionContext = {
    variables: new Map<string, unknown>([
      ['topic', 'Vue vs React'],
    ]),
    nodeOutputs: new Map<string, unknown>([
      ['node-1', 'Vue is great'],
      ['node-2', { text: 'hello' }],
    ]),
  }

  it('should replace {{variable}} from variables', () => {
    expect(renderTemplate('Task: {{topic}}', context)).toBe('Task: Vue vs React')
  })

  it('should replace {{nodeId.output}} from nodeOutputs', () => {
    expect(renderTemplate('Result: {{node-1.output}}', context)).toBe('Result: Vue is great')
  })

  it('should handle missing variables', () => {
    expect(renderTemplate('Hello {{unknown}}', context)).toBe('Hello {{unknown}}')
  })

  it('should JSON stringify objects from nodeOutputs', () => {
    expect(renderTemplate('Data: {{node-2.output}}', context)).toBe('Data: {"text":"hello"}')
  })

  it('should handle empty string template', () => {
    expect(renderTemplate('', context)).toBe('')
  })

  it('should handle null value', () => {
    const ctx: ExecutionContext = {
      variables: new Map<string, unknown>([['x', null]]),
      nodeOutputs: new Map(),
    }
    expect(renderTemplate('{{x}}', ctx)).toBe('null')
  })
})
