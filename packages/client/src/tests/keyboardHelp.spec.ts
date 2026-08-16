import { KEY_ROWS, SPECIAL_KEYS } from '../ui/keyboardHelp'

describe('keyboard help layout data', () => {
  const letterCaps = KEY_ROWS.flatMap(r => r.caps)
  const bound = [...letterCaps, ...SPECIAL_KEYS].filter(c => c.label)

  it('covers every bound key exactly once, each with a label (ISC-392)', () => {
    const expected = [
      // GameScene addKeys('W,A,S,D,Q,E,Z,C,O,F,X,B,H,U,P,T,R,G') …
      'W', 'A', 'S', 'D', 'Q', 'E', 'Z', 'C', 'O', 'F', 'X', 'B', 'H', 'U', 'P', 'T', 'R', 'G',
      // … plus the dedicated keydown handlers
      'L', 'M', 'Enter', 'Esc',
    ]
    const keys = bound.map(c => c.key)
    expect([...keys].sort()).toEqual([...expected].sort())
    expect(new Set(keys).size).toBe(keys.length) // no duplicates
    for (const cap of bound) expect(cap.label!.length).toBeGreaterThan(0)
  })

  it('rows mirror the physical QWERTY stagger: three letter rows with growing offsets', () => {
    expect(KEY_ROWS).toHaveLength(3)
    expect(KEY_ROWS[0].offset).toBe(0)
    expect(KEY_ROWS[1].offset).toBeGreaterThan(KEY_ROWS[0].offset)
    expect(KEY_ROWS[2].offset).toBeGreaterThan(KEY_ROWS[1].offset)
    // spot-check physical placement: the movement rose stacks Q/W/E over A/S/D over Z/X/C
    expect(KEY_ROWS[0].caps.slice(0, 3).map(c => c.key)).toEqual(['Q', 'W', 'E'])
    expect(KEY_ROWS[1].caps.slice(0, 3).map(c => c.key)).toEqual(['A', 'S', 'D'])
    expect(KEY_ROWS[2].caps.slice(0, 3).map(c => c.key)).toEqual(['Z', 'X', 'C'])
  })

  it('unbound keys stay in place as spacers so bound keys sit at true positions', () => {
    const unbound = letterCaps.filter(c => !c.label).map(c => c.key)
    expect(unbound.sort()).toEqual(['I', 'J', 'K', 'N', 'V', 'Y'])
  })
})
