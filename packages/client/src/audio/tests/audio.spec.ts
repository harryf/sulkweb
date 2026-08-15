import { describe, it, expect } from 'vitest'
import { GameEngine, loadMission, missions, SeededRng, PieceEvents } from '@sulk/engine/index.js'
import {
  AUDIO_CONFIG, duckTarget, shotSfx, deathSfx, combatSfx,
  trackerIntervalMs, trackerDetune, nearestThreatDistance, SfxThrottle,
} from '../audioLogic.js'
import { MUSIC_TRACKS, trackForMission, musicFile } from '../audioManifest.js'
import { ALIEN_SEGMENTS } from '../alienSegments.js'

/** Sound-system pure logic (ISC-298/299, 312..324) — no Phaser required. */

describe('mission music manifest (ISC-298/299)', () => {
  it('every registered mission has its own distinct track', () => {
    const registered = Object.keys(missions)
    for (const m of registered) {
      expect(trackForMission(m), `no track for ${m}`).toBeDefined()
      expect(musicFile(m)).toBe(`assets/audio/music/${m}.ogg`)
    }
    expect(new Set(MUSIC_TRACKS.map(t => t.videoId)).size).toBe(MUSIC_TRACKS.length)
    expect(new Set(MUSIC_TRACKS.map(t => t.mission)).size).toBe(MUSIC_TRACKS.length)
  })

  it('every track carries full credit fields from the video description', () => {
    for (const t of MUSIC_TRACKS) {
      expect(t.videoId).toMatch(/^[\w-]{11}$/)
      expect(t.title.length).toBeGreaterThan(0)
      expect(t.album.length).toBeGreaterThan(0)
      expect(t.artist.length).toBeGreaterThan(0)
    }
  })
})

describe('alien segment classification (ISC-303/304)', () => {
  it('≥8 segments, unique files, every combat role represented, all windows sane', () => {
    expect(ALIEN_SEGMENTS.length).toBeGreaterThanOrEqual(8)
    expect(new Set(ALIEN_SEGMENTS.map(s => s.file)).size).toBe(ALIEN_SEGMENTS.length)
    for (const role of ['stealer_move', 'stealer_attack', 'stealer_death', 'stealer_door']) {
      expect(ALIEN_SEGMENTS.some(s => s.role === role), `no ${role}`).toBe(true)
    }
    for (const s of ALIEN_SEGMENTS) {
      expect(s.start).toBeGreaterThanOrEqual(0)
      expect(s.secs).toBeGreaterThan(0.25)
      expect(typeof s.guess).toBe('boolean')
      expect(s.note.length).toBeGreaterThan(0)
    }
  })
})

describe('phase ducking (ISC-312/314/327)', () => {
  it('marine phase is the quiet bed; stealer phase is louder; both under the SFX gain', () => {
    expect(duckTarget('MarineAction')).toBe(AUDIO_CONFIG.musicQuiet)
    expect(duckTarget('StealerAction')).toBe(AUDIO_CONFIG.musicLoud)
    expect(AUDIO_CONFIG.musicQuiet).toBeLessThan(AUDIO_CONFIG.musicLoud)
    // Antecedent: music stays BACKGROUND — loud ceiling ≤ half the SFX gain.
    expect(AUDIO_CONFIG.musicLoud).toBeLessThanOrEqual(AUDIO_CONFIG.sfxGain / 2)
    expect(AUDIO_CONFIG.fadeMs).toBeGreaterThanOrEqual(500)
  })

  it('the captured stealer-phase stream carries the phase flips the ducking follows', () => {
    const engine = new GameEngine(loadMission('beta_2'), [], new SeededRng(1))
    const stream = PieceEvents.capture(() => engine.endMarinePhase())
    const phases = stream.filter(e => e.type === 'phaseChanged')
      .map(e => (e.payload as { phase: string }).phase)
    expect(phases[0]).toBe('StealerAction')
    expect(phases[phases.length - 1]).toBe('MarineAction')
    expect(phases.map(duckTarget)[0]).toBe(AUDIO_CONFIG.musicLoud)
    expect(phases.map(duckTarget)[phases.length - 1]).toBe(AUDIO_CONFIG.musicQuiet)
  })
})

describe('event → SFX routing (ISC-315..319)', () => {
  it('weapon-correct shot sounds', () => {
    expect(shotSfx('terminator_storm_bolter')).toBe('sfx_bolter')
    expect(shotSfx('terminator_sergeant')).toBe('sfx_bolter')
    expect(shotSfx('terminator_heavy_flamer')).toBe('sfx_flamer')
    expect(shotSfx('terminator_assault_cannon')).toBe('sfx_cannon')
    expect(shotSfx(undefined)).toBe('sfx_bolter')
  })
  it('death voices by kind; blips die silently', () => {
    expect(deathSfx('stealer')).toBe('sfx_stealer_death')
    expect(deathSfx('marine')).toBe('sfx_marine_death')
    expect(deathSfx('blip')).toBeNull()
  })
  it('chain fist revs in melee, everyone else thumps', () => {
    expect(combatSfx('terminator_chain_fist')).toBe('sfx_chain_fist')
    expect(combatSfx('terminator_storm_bolter')).toBe('sfx_cc')
  })
})

describe('motion tracker (ISC-322/323/324)', () => {
  it('interval is monotonic in distance and bounded', () => {
    const { minMs, maxMs, nearDist, farDist } = AUDIO_CONFIG.tracker
    expect(trackerIntervalMs(null)).toBeNull()
    expect(trackerIntervalMs(0)).toBe(minMs)
    expect(trackerIntervalMs(nearDist)).toBe(minMs)
    expect(trackerIntervalMs(farDist)).toBe(maxMs)
    expect(trackerIntervalMs(999)).toBe(maxMs)
    let prev = -1
    for (let d = 0; d <= farDist + 2; d++) {
      const v = trackerIntervalMs(d)!
      expect(v).toBeGreaterThanOrEqual(prev)
      expect(v).toBeGreaterThanOrEqual(minMs)
      expect(v).toBeLessThanOrEqual(maxMs)
      prev = v
    }
  })
  it('detune tightens as threats close in', () => {
    const { nearDist, farDist, detuneMax } = AUDIO_CONFIG.tracker
    expect(trackerDetune(null)).toBe(0)
    expect(trackerDetune(nearDist)).toBe(detuneMax)
    expect(trackerDetune(farDist)).toBe(0)
    expect(trackerDetune(Math.floor((nearDist + farDist) / 2))).toBeGreaterThan(0)
  })
  it('nearest-threat Chebyshev distance; empty board parks the tracker', () => {
    expect(nearestThreatDistance([], [{ x: 1, y: 1 }])).toBeNull()
    expect(nearestThreatDistance([{ x: 1, y: 1 }], [])).toBeNull()
    expect(nearestThreatDistance(
      [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      [{ x: 13, y: 12 }, { x: 20, y: 0 }],
    )).toBe(3) // (10,10)→(13,12) = max(3,2)
  })
})

describe('replay skitter throttle (ISC-320)', () => {
  it('a burst of 20 triggers in one window yields exactly one play', () => {
    let now = 0
    const t = new SfxThrottle(150, () => now)
    let played = 0
    for (let i = 0; i < 20; i++) { now += 5; if (t.accept('skitter')) played++ }
    expect(played).toBe(1)
    now += 200
    expect(t.accept('skitter')).toBe(true)
    // Independent keys don't starve each other.
    expect(t.accept('clank')).toBe(true)
  })
})
