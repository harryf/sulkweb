import { describe, it, expect } from 'vitest'
import { SeededRng, RollQueue } from '../core/Dice.js'

describe('Dice sources', () => {
  it('SeededRng: same seed gives the same d6 stream, all rolls in 1..6', () => {
    const a = new SeededRng(42), b = new SeededRng(42)
    const streamA = Array.from({ length: 50 }, () => a.roll())
    const streamB = Array.from({ length: 50 }, () => b.roll())
    expect(streamA).toEqual(streamB)
    expect(streamA.every(r => r >= 1 && r <= 6)).toBe(true)
  })

  it('RollQueue: serves scripted rolls in order and reports remaining', () => {
    const q = new RollQueue([6, 1, 3])
    expect(q.roll()).toBe(6)
    expect(q.remaining).toBe(2)
    expect(q.roll()).toBe(1)
    expect(q.roll()).toBe(3)
    expect(q.remaining).toBe(0)
  })

  it('RollQueue: throws loudly when a test scripts too few rolls', () => {
    const q = new RollQueue([])
    expect(() => q.roll()).toThrow(/RollQueue exhausted/)
  })
})
