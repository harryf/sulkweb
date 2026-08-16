import { describe, it, expect, beforeEach, vi } from 'vitest'

// HudPanel only needs Container as a base class plus a scene.add factory —
// mock Phaser at the module boundary, keep the test about HUD behavior.
vi.mock('phaser', () => {
  class Container {
    x = 0; y = 0; width = 0; height = 0
    list: unknown[] = []
    constructor(_scene?: unknown, _x?: number, _y?: number) {}
    add(child: unknown) { this.list.push(child); return this }
    setScrollFactor(_f: number) { return this }
    setPosition(x: number, y: number) { this.x = x; this.y = y; return this }
    setSize(w: number, h: number) { this.width = w; this.height = h; return this }
    setDepth(_d: number) { return this }
  }
  return { default: { GameObjects: { Container } } }
})

import { HudPanel } from '../HudPanel.js'
import { PieceEvents } from '@sulk/engine/index.js'

function makeSceneStub() {
  return {
    scale: { height: 720 },
    add: {
      rectangle: () => ({ x: 0, y: 0, setOrigin() { return this }, setInteractive() { return this }, on() { return this } }),
      text: (_x: number, _y: number, content: string) => ({
        text: content,
        visible: true,
        setText(next: string) { this.text = next; return this },
        setVisible(v: boolean) { this.visible = v; return this }
      })
    }
  } as any
}

function makeMiniMapStub() {
  return { y: 8, height: 226, setPosition() { return this } } as any
}

describe('HudPanel', () => {
  let hud: HudPanel

  beforeEach(() => {
    PieceEvents.all.clear()
    hud = new HudPanel(makeSceneStub(), makeMiniMapStub())
  })

  it('shows AP from the selection payload', () => {
    PieceEvents.emit('selected', { pieceId: 'm1', ap: { apRemaining: 3, apInitial: 4 } })
    expect((hud as any).apText.text).toBe('AP: 3/4')
  })

  it('clears on deselect', () => {
    PieceEvents.emit('selected', { pieceId: 'm1', ap: { apRemaining: 3, apInitial: 4 } })
    PieceEvents.emit('selected', { pieceId: null })
    expect((hud as any).apText.text).toBe('AP: --/--')
  })

  it('updates on apChanged only for the selected piece', () => {
    PieceEvents.emit('selected', { pieceId: 'm1', ap: { apRemaining: 4, apInitial: 4 } })
    PieceEvents.emit('apChanged', { pieceId: 'other', apRemaining: 1, apInitial: 4 })
    expect((hud as any).apText.text).toBe('AP: 4/4')
    PieceEvents.emit('apChanged', { pieceId: 'm1', apRemaining: 2, apInitial: 4 })
    expect((hud as any).apText.text).toBe('AP: 2/4')
  })
})
