import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine, loadMission, SeededRng, PieceEvents } from '@sulk/engine/index.js'
import { buildRoster, groupBySquad, assignHotkeys, nameOffset, NAME_POOL } from '../marineNames.js'
import { RosterPanel, type PieceStats } from '../RosterPanel.js'

/** Roster identities + DOM panel (ISC-275/276 + panel states without a browser). */

const freshEngine = () => new GameEngine(loadMission('beta_2'), [], new SeededRng(1))

describe('marine identities (ISC-275/276)', () => {
  it('names are deterministic and static: same mission → identical roster', () => {
    const a = buildRoster(freshEngine(), loadMission('beta_2'))
    const b = buildRoster(freshEngine(), loadMission('beta_2'))
    // Piece ids are session handles (global counter) — identity is everything else.
    const strip = (r: typeof a) => r.map(({ id: _id, ...rest }) => rest)
    expect(strip(a)).toEqual(strip(b))
    expect(a).toHaveLength(10)
    expect(new Set(a.map(e => e.name)).size).toBe(10) // no duplicate names
  })

  it('entries map BY ID with squad + rank titles from the deployment metadata', () => {
    const engine = freshEngine()
    const roster = buildRoster(engine, loadMission('beta_2'))
    expect(roster.map(e => e.id)).toEqual(engine.marines.map(m => m.id))
    expect(roster.map(e => e.squad)).toEqual(
      [...Array(5).fill('Sakharov'), ...Array(5).fill('Sternfeld')])
    const sergeants = roster.filter(e => e.type === 'sergeant' || e.type === 'sergeant_sword')
    expect(sergeants).toHaveLength(2)
    for (const s of sergeants) expect(s.name).toMatch(/^Sgt\. /)
    expect(roster.filter(e => e.type === 'storm_bolter').every(e => e.name.startsWith('Bro. '))).toBe(true)
    expect(roster.find(e => e.type === 'assault_cannon')?.special).toBe('Assault Cannon')
    expect(roster.find(e => e.type === 'sergeant_sword')?.special).toBe('Power Sword')
  })

  it('zip cross-check: engine piece weapons match deploy types pair-for-pair; s6 arbitrated map is exact (Advisor 2026-08-15)', () => {
    // space_hulk_6 is the mission where a silent permutation would hide —
    // identical squad rosters, hand-arbitrated interleave. Pin the full map.
    const engine = new GameEngine(loadMission('space_hulk_6'), [], new SeededRng(1))
    const roster = buildRoster(engine, loadMission('space_hulk_6'))
    expect(roster.some(e => e.squad === 'Unknown')).toBe(false) // weapon cross-check clean
    expect(roster.map(e => `${e.squad}:${e.type}`)).toEqual([
      'Luther:storm_bolter', 'Luther:storm_bolter', 'Snow:storm_bolter',
      'Luther:storm_bolter', 'Snow:storm_bolter', 'Snow:storm_bolter',
      'Luther:sergeant', 'Snow:sergeant', 'Luther:heavy_flamer', 'Snow:heavy_flamer',
    ])
    // And the cross-check actually fires: a permuted deployment downgrades loudly.
    const twisted = structuredClone(loadMission('space_hulk_6'))
    twisted.marineDeployment!.reverse()
    const bad = buildRoster(engine, twisted)
    expect(bad.some(e => e.squad === 'Unknown')).toBe(true)
  })

  it('squad rows order sergeant → specials → bolters; offset stays in pool range', () => {
    const rows = groupBySquad(buildRoster(freshEngine(), loadMission('beta_2')))
    expect(rows.map(r => r.squad)).toEqual(['Sakharov', 'Sternfeld'])
    expect(rows[0].members.map(e => e.type)).toEqual(
      ['sergeant', 'assault_cannon', 'storm_bolter', 'storm_bolter', 'storm_bolter'])
    expect(rows[1].members.map(e => e.type)).toEqual(
      ['sergeant_sword', 'chain_fist', 'heavy_flamer', 'storm_bolter', 'storm_bolter'])
    expect(nameOffset('beta_2')).toBeLessThan(NAME_POOL.length)
    // Rows are titled after their sergeant (ISC-295); grouping key stays original
    for (const row of rows) {
      const sgt = row.members.find(m => m.name.startsWith('Sgt. '))!
      expect(row.title).toBe(`Squad ${sgt.name.slice(5)}`)
    }
    expect(rows.map(r => r.squad)).toEqual(['Sakharov', 'Sternfeld'])
    // Leaderless squad falls back to its first member (debug_1's lone bolter)
    const solo = groupBySquad(buildRoster(
      new GameEngine(loadMission('debug_1'), [], new SeededRng(1)), loadMission('debug_1')))
    expect(solo).toHaveLength(1)
    expect(solo[0].title).toBe(`Squad ${solo[0].members[0].name.replace(/^Bro\. /, '')}`)
    expect(solo[0].members[0].name).toMatch(/^Bro\. /)
  })
})

describe('RosterPanel DOM', () => {
  let engine: GameEngine
  let panel: RosterPanel

  const stats = (id: string): PieceStats => {
    const p = engine.findPiece(id) as { alive: boolean; apRemaining: number; apInitial: number; facing: number; ammo?: number } | undefined
    return p
      ? { alive: p.alive, apRemaining: p.apRemaining, apInitial: p.apInitial, overwatch: false, jammed: false, facing: p.facing, ammo: p.ammo }
      : { alive: false, apRemaining: 0, apInitial: 4, overwatch: false, jammed: false, facing: 0 }
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    PieceEvents.all.clear()
    engine = freshEngine()
  })

  it('renders squad rows with cards, AP stats, and weapon labels', () => {
    panel = new RosterPanel(buildRoster(engine, engine.mission), stats, () => {})
    expect(document.querySelectorAll('.squad-row')).toHaveLength(2)
    expect(document.querySelectorAll('.marine-card')).toHaveLength(10)
    const first = document.querySelector('.marine-card')!
    expect(first.querySelector('.m-name')!.textContent).toMatch(/^Sgt\. /)
    expect(first.querySelector('.m-stats')!.textContent).toBe('AP 4/4 · CP 0')
    expect(document.querySelectorAll('.m-weapon')).toHaveLength(4) // AC, CF, sword, flamer
  })

  it('facing arrow, CP pool, and own-line ammo render and stay live (ISC-288/289/290)', () => {
    panel = new RosterPanel(buildRoster(engine, engine.mission), stats, () => {})
    const sgt = engine.marines[3] // Sakharov sergeant, deployed facing down
    const card = document.querySelector(`[data-piece-id="${sgt.id}"]`)!
    expect(card.querySelector('.m-face')!.textContent).toBe('↓')
    sgt.tryTurn(1) // face west — pieceMoved fires, arrow follows
    expect(card.querySelector('.m-face')!.textContent).toBe('←')

    PieceEvents.emit('cpChanged', { cp: 3 })
    expect(card.querySelector('.m-stats')!.textContent).toBe('AP 3/4 · CP 3') // turn cost 1 AP

    const flamer = engine.marines.find(m => (m as { ammo?: number }).ammo !== undefined)!
    const fCard = document.querySelector(`[data-piece-id="${flamer.id}"]`)!
    expect(fCard.querySelector('.m-stats')!.textContent).toBe('AP 4/4 · CP 3') // no ammo in the stats line…
    expect(fCard.querySelector('.m-ammo')!.textContent).toBe('Ammo 10')        // …it lives on its own line (AC gunner)
    void panel
  })

  it('death greys the card and blocks selection; selection highlights exactly one card', () => {
    const clicks: string[] = []
    panel = new RosterPanel(buildRoster(engine, engine.mission), stats, id => clicks.push(id))
    const victim = engine.marines[0]
    victim.die()
    const card = document.querySelector(`[data-piece-id="${victim.id}"]`)!
    expect(card.classList.contains('dead')).toBe(true)
    expect(card.querySelector('.m-state')!.textContent).toBe('KIA')
    ;(card as HTMLElement).click()
    expect(clicks).toHaveLength(0)

    const survivor = engine.marines[1]
    const sCard = document.querySelector(`[data-piece-id="${survivor.id}"]`) as HTMLElement
    sCard.click()
    expect(clicks).toEqual([survivor.id])
    PieceEvents.emit('selected', { pieceId: survivor.id })
    expect(document.querySelectorAll('.marine-card.selected')).toHaveLength(1)
    expect(sCard.classList.contains('selected')).toBe(true)
    void panel
  })

  it('C.A.T. carrier badge follows pickup/drop; ESCAPED styling differs from KIA (ISC-282/283)', () => {
    panel = new RosterPanel(buildRoster(engine, engine.mission), stats, () => {})
    const carrier = engine.marines[2]
    PieceEvents.emit('catPickedUp', { carrierId: carrier.id })
    const card = document.querySelector(`[data-piece-id="${carrier.id}"]`)!
    expect(card.classList.contains('has-cat')).toBe(true)
    expect(card.querySelector('.m-badges')!.textContent).toContain('C.A.T.')
    PieceEvents.emit('catDropped', { x: 1, y: 1 })
    expect(card.classList.contains('has-cat')).toBe(false)
    expect(card.querySelector('.m-badges')!.textContent).not.toContain('C.A.T.')

    const runner = engine.marines[3]
    PieceEvents.emit('marineEscaped', { pieceId: runner.id, escaped: 1 })
    const rCard = document.querySelector(`[data-piece-id="${runner.id}"]`)!
    expect(rCard.classList.contains('escaped')).toBe(true)
    expect(rCard.classList.contains('dead')).toBe(false)
    expect(rCard.querySelector('.m-state')!.textContent).toBe('ESCAPED')
    // An escaped marine's selection hotkey is inert — the badge must go too (ISC-662).
    expect(rCard.querySelector('.m-hotkey')).toBeNull()
  })
})

describe('selection hotkeys (ISC-656/657/663/664)', () => {
  const entry = (id: string, squad: string, type = 'storm_bolter'): any =>
    ({ id, name: `Bro. ${id}`, squad, type, spriteKey: 'terminator_storm_bolter' })

  it('beta_2: squad one gets 1-5 and squad two 6-0 in DISPLAYED order (sergeant first)', () => {
    const engine = freshEngine()
    const roster = buildRoster(engine, loadMission('beta_2'))
    const hotkeys = assignHotkeys(roster)
    const rows = groupBySquad(roster)
    expect(rows.map(r => r.squad)).toEqual(['Sakharov', 'Sternfeld'])
    expect(rows[0].members.map(m => hotkeys.get(m.id))).toEqual(['1', '2', '3', '4', '5'])
    expect(rows[1].members.map(m => hotkeys.get(m.id))).toEqual(['6', '7', '8', '9', '0'])
    // The card order starts with the sergeant, so [1] and [6] are the sergeants.
    expect(rows[0].members[0].name).toMatch(/^Sgt\. /)
    expect(hotkeys.get(rows[0].members[0].id)).toBe('1')
  })

  it('squad two starts at 6 even when squad one is short; extras and a third squad get no key', () => {
    const entries = [
      entry('a1', 'Alpha'), entry('a2', 'Alpha'), entry('a3', 'Alpha'), // short squad one
      entry('b1', 'Beta'), entry('b2', 'Beta'), entry('b3', 'Beta'),
      entry('b4', 'Beta'), entry('b5', 'Beta'), entry('b6', 'Beta'),    // oversized squad two
      entry('c1', 'Gamma'),                                             // third squad
    ]
    const hotkeys = assignHotkeys(entries)
    expect(hotkeys.get('a1')).toBe('1')
    expect(hotkeys.get('a3')).toBe('3')
    expect(hotkeys.get('b1')).toBe('6')
    expect(hotkeys.get('b5')).toBe('0')
    expect(hotkeys.get('b6')).toBeUndefined() // sixth member of a squad: no key
    expect(hotkeys.get('c1')).toBeUndefined() // third squad: no keys
    expect(hotkeys.size).toBe(8)
  })

  // No unit test for "numbers never reshuffle on death": assignHotkeys reads no
  // engine state, so any such assertion is tautological (review 2026-08-19).
  // The real invariant lives in GameScene's bind-once and is pinned by the
  // hotkeys e2e (kill [2], then [3] still selects the ORIGINAL third marine).
})
