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

describe('HudPanel (Mission Status)', () => {
  let hud: HudPanel

  beforeEach(() => {
    PieceEvents.all.clear()
    hud = new HudPanel(makeSceneStub(), makeMiniMapStub())
  })

  it('is mission-level only: no AP or CP readouts exist (per-marine stats live on roster cards)', () => {
    expect((hud as any).apText).toBeUndefined()
    expect((hud as any).cpText).toBeUndefined()
    // and it no longer listens to per-marine selection/AP/ammo channels
    PieceEvents.emit('selected', { pieceId: 'm1', ap: { apRemaining: 3, apInitial: 4 }, ammo: 6 })
    PieceEvents.emit('apChanged', { pieceId: 'm1', apRemaining: 2, apInitial: 4 })
    PieceEvents.emit('ammoChanged', { pieceId: 'm1', ammo: 5 })
    // nothing to assert beyond "no crash": the HUD ignores these channels now
  })

  it('tracks casualties from pieceDied', () => {
    PieceEvents.emit('pieceDied', { pieceId: 's1', kind: 'stealer', x: 0, y: 0 })
    PieceEvents.emit('pieceDied', { pieceId: 'm1', kind: 'marine', x: 0, y: 0 })
    expect((hud as any).casualtyText.text).toBe('Kills: 1   Losses: 1')
  })

  it('kill-quota missions show the value-weighted toll against the quota', () => {
    hud.setKillQuota(30)
    PieceEvents.emit('casualtiesChanged', { casualties: 3 })
    expect((hud as any).casualtyText.text).toBe('Kills: 3/30   Losses: 0')
  })

})

describe('HudPanel (the live clock, 2.x)', () => {
  let hud: HudPanel

  beforeEach(() => {
    PieceEvents.all.clear()
    hud = new HudPanel(makeSceneStub(), makeMiniMapStub())
  })

  it('the cycle line follows phaseChanged and deployment', () => {
    PieceEvents.emit('phaseChanged', { phase: 'Live', turn: 2 })
    expect((hud as any).phaseText.text).toBe('Cycle 2')
    PieceEvents.emit('phaseChanged', { phase: 'Deploy', turn: 1 })
    expect((hud as any).phaseText.text).toBe('DEPLOYMENT')
  })

  it('the clock line shows the cycle and the seconds into it from tick events', () => {
    PieceEvents.emit('tick', { tick: 52, cycle: 2 })
    expect((hud as any).phaseText.text).toBe('Cycle 2')
    expect((hud as any).timerText.text).toBe('3s / 10s') // 12 ticks of 250 ms into a 40-tick cycle
    hud.setClock(0, 1)
    expect((hud as any).timerText.text).toBe('0s / 10s')
  })

  it('the one button reads PAUSE and can be relabelled START for deployment', () => {
    expect((hud as any).doneLabel.text).toBe('PAUSE  Esc')
    hud.setPrimaryButton('START  ⏎')
    expect((hud as any).doneLabel.text).toBe('START  ⏎')
  })
})
