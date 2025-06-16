import { describe,it,expect, beforeEach } from 'vitest'
import { Selection } from '../src/ui/Selection.js'

describe('Selection store', () => {
  beforeEach(() => {
    Selection.clear();
  });

  it('toggles same id', () => {
    Selection.toggle('p1')
    expect(Selection.get()).toBe('p1')
    Selection.toggle('p1')
    expect(Selection.get()).toBeNull()
  })

  it('switches to new id', () => {
    Selection.select('p1')
    const prev = Selection.select('p2')
    expect(prev).toBe('p1')
    expect(Selection.get()).toBe('p2')
  })
})
