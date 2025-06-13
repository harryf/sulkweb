import { projectCamToMini } from '../utils/cameraBox'

describe('projectCamToMini', () => {
  const board = { w: 1000, h: 1000 }
  const mini  = { x: 0, y: 0, w: 100, h: 100 }

  it('maps centre correctly', () => {
    const box = projectCamToMini({ x: 250, y: 250, w: 500, h: 500 }, board, mini, 2)
    expect(box).toEqual({ x: 25, y: 25, w: 50, h: 50 })
  })

  it('clamps left/top', () => {
    const b = projectCamToMini({ x: -20, y: -20, w: 300, h: 300 }, board, mini, 2)
    expect(b.x).toBe(1); expect(b.y).toBe(1) // Clamped to mini.x + halfLineWidth
  })

  it('clamps right/bottom', () => {
    const b = projectCamToMini({ x: 900, y: 900, w: 200, h: 200 }, board, mini, 2)
    // Ensure the right edge of the projected box is within or at the right edge of the minimap
    expect(b.x + b.w).toBeLessThanOrEqual(mini.x + mini.w - 1) // Clamped to mini.x + mini.w - halfLineWidth
    // Ensure the bottom edge of the projected box is within or at the bottom edge of the minimap
    expect(b.y + b.h).toBeLessThanOrEqual(mini.y + mini.h - 1) // Clamped to mini.y + mini.h - halfLineWidth
  })
})
