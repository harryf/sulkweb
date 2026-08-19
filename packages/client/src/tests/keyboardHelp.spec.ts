import { KEY_ROWS, SPECIAL_KEYS } from '../ui/keyboardHelp'

describe('keyboard help layout data', () => {
  const letterCaps = KEY_ROWS.flatMap(r => r.caps)
  const bound = [...letterCaps, ...SPECIAL_KEYS].filter(c => c.label)
  const byKey = new Map(letterCaps.map(c => [c.key, c]))

  it('covers every bound key exactly once, each with a label (ISC-392/642)', () => {
    const expected = [
      // GameScene addKeys('W,A,S,D,Q,E,Z,C,O,F,X,B,H,U,P,T,R,G,M') …
      'W', 'A', 'S', 'D', 'Q', 'E', 'Z', 'C', 'O', 'F', 'X', 'B', 'H', 'U', 'P', 'T', 'R', 'G', 'M',
      // … plus the dedicated keydown handlers
      'L', 'K', '1-0', 'Enter', 'Esc',
    ]
    const keys = bound.map(c => c.key)
    expect([...keys].sort()).toEqual([...expected].sort())
    expect(new Set(keys).size).toBe(keys.length) // no duplicates
    for (const cap of bound) expect(cap.label!.length).toBeGreaterThan(0)
  })

  it('QWE/AD/ZXC form the directional circle with S as the door key (ISC-642)', () => {
    expect(byKey.get('Z')!.label).toBe('back left')
    expect(byKey.get('X')!.label).toBe('back')
    expect(byKey.get('C')!.label).toBe('back right')
    expect(byKey.get('S')!.label).toBe('open door')
    expect(byKey.get('M')!.label).toBe('melee')
    expect(byKey.get('K')!.label).toBe('mute')
  })

  it('weapon-specific keys carry their weapon in a sub-label + requirement (ISC-643)', () => {
    for (const key of ['R', 'T']) {
      expect(byKey.get(key)!.sub).toBe('assault cannon')
      expect(byKey.get(key)!.requires).toBe('assault_cannon')
    }
    expect(byKey.get('G')!.sub).toBe('chain fist')
    expect(byKey.get('G')!.requires).toBe('chain_fist')
    expect(byKey.get('B')!.sub).toBe('heavy flamer')
    expect(byKey.get('B')!.requires).toBe('heavy_flamer')
    // Nothing else claims a weapon requirement.
    const others = letterCaps.filter(c => !['R', 'T', 'G', 'B'].includes(c.key))
    for (const cap of others) expect(cap.requires).toBeUndefined()
  })

  it('rows mirror the physical QWERTY stagger: three letter rows with growing offsets', () => {
    expect(KEY_ROWS).toHaveLength(3)
    expect(KEY_ROWS[0].offset).toBe(0)
    expect(KEY_ROWS[1].offset).toBeGreaterThan(KEY_ROWS[0].offset)
    expect(KEY_ROWS[2].offset).toBeGreaterThan(KEY_ROWS[1].offset)
    // spot-check physical placement: the movement circle stacks Q/W/E over A/S/D over Z/X/C
    expect(KEY_ROWS[0].caps.slice(0, 3).map(c => c.key)).toEqual(['Q', 'W', 'E'])
    expect(KEY_ROWS[1].caps.slice(0, 3).map(c => c.key)).toEqual(['A', 'S', 'D'])
    expect(KEY_ROWS[2].caps.slice(0, 3).map(c => c.key)).toEqual(['Z', 'X', 'C'])
  })

  it('unbound keys stay in place as spacers so bound keys sit at true positions', () => {
    const unbound = letterCaps.filter(c => !c.label).map(c => c.key)
    expect(unbound.sort()).toEqual(['I', 'J', 'N', 'V', 'Y'])
  })
})
