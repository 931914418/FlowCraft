import { describe, it, expect } from 'vitest'
import { renderTemplate } from '../executors'

describe('renderTemplate', () => {
  const context = new Map<string, unknown>([
    ['topic', 'Vue vs React'],
    ['node-1.output', 'Vue is great'],
    ['node-2.output', { text: 'hello' }],
  ])

  it('should replace {{variable}}', () => {
    expect(renderTemplate('Task: {{topic}}', context)).toBe('Task: Vue vs React')
  })

  it('should replace nested outputs', () => {
    expect(renderTemplate('Result: {{node-1.output}}', context)).toBe('Result: Vue is great')
  })

  it('should handle missing variables', () => {
    expect(renderTemplate('Hello {{unknown}}', context)).toBe('Hello {{unknown}}')
  })

  it('should JSON stringify objects', () => {
    expect(renderTemplate('Data: {{node-2.output}}', context)).toBe('Data: {"text":"hello"}')
  })

  it('should handle empty string template', () => {
    expect(renderTemplate('', context)).toBe('')
  })

  it('should handle null value', () => {
    const ctx = new Map([['x', null]])
    expect(renderTemplate('{{x}}', ctx)).toBe('null')
  })
})
