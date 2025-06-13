import { vi } from 'vitest'
import { SelectionManager } from '../utils/SelectionManager.js'
import './phaser-mock.js'
import { HighlightSprite } from '../ui/HighlightSprite.js'

describe('SelectionManager', () => {
  it('selects when empty', () => {
    const sel = new SelectionManager()
    expect(sel.toggle({ c: 1, r: 2 })).toEqual({ c: 1, r: 2 })
    expect(sel.current).toEqual({ c: 1, r: 2 })
  })

  it('deselects on same square', () => {
    const sel = new SelectionManager()
    sel.toggle({ c: 3, r: 4 })          // selected
    expect(sel.toggle({ c: 3, r: 4 })).toBeNull()
    expect(sel.current).toBeNull()
  })

  it('moves highlight to different square', () => {
    const sel = new SelectionManager()
    sel.toggle({ c: 0, r: 0 })
    expect(sel.toggle({ c: 5, r: 5 })).toEqual({ c: 5, r: 5 })
    expect(sel.current).toEqual({ c: 5, r: 5 })
  })
})

describe('HighlightSprite', () => {
  it('creates a highlight sprite with correct properties', () => {
    const mockScene = { add: { existing: vi.fn() } }
    const tileSize = 40
    
    const highlight = new HighlightSprite(mockScene as any, tileSize)
    
    // Test that the highlight has the correct properties
    expect(highlight.setOrigin).toBeDefined()
    expect(highlight.setDisplaySize).toBeDefined()
    expect(highlight.setDepth).toBeDefined()
  })
  
  it('moves to the correct position based on coordinates', () => {
    const mockScene = { add: { existing: vi.fn() } }
    const tileSize = 40
    const highlight = new HighlightSprite(mockScene as any, tileSize)
    
    // Spy on setPosition method
    const setPositionSpy = vi.spyOn(highlight, 'setPosition')
    
    // Move highlight to a specific coordinate
    highlight.moveTo({ c: 3, r: 2 }, tileSize)
    
    // Check if setPosition was called with the correct values
    expect(setPositionSpy).toHaveBeenCalledWith(3 * tileSize, 2 * tileSize)
  })
})
