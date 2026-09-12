import { Piece, type Coord } from './pieces/Piece.js';
import { StormBolterMarine, SergeantMarine, SwordSergeantMarine } from './pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from './pieces/HeavyFlamerMarine.js';
import { AssaultCannonMarine, ChainFistMarine } from './pieces/AssaultCannonMarine.js';
import { deployAmbushCounter } from './pieces/AmbushCounter.js';
import { Blip } from './pieces/Blip.js';
import { Board } from './board/Board.js'
import type { CompiledMission, MarineType } from './missions/missionTypes.js'
import { Dir, DIR_VEC, FACING_WORD } from './core/Direction.js';
import { TUNING } from './core/CostTables.js';
import type { MarineCommand } from './core/Commands.js';
import { stealerTick, spawnBlips, rankEntries, convertRevealedBlips, chargeOrientation } from './ai/StealerAI.js';
import { runMarineAI } from './ai/MarineAI.js';
import { expireFlames } from './rules/flame.js';
import { closeCombat } from './rules/combat.js';
import { deployFacing, orderSquaresFrontToBack, autoDeployOrder } from './rules/deploy.js';
import type { DeploySquareJSON } from './missions/missionTypes.js';
import {
  initCat, initDucting, looseCatPos, pickUpCat, wanderCat,
  anyDuctingDestroyed, destroyDuctingAt, intactDucting,
} from './rules/exotic.js';
import { PieceEvents } from './events/PieceEvents.js';
import type { DiceSource } from './core/Dice.js';

export type GameResult = 'ongoing' | 'win' | 'loss' | 'draw';
/** 2.x: the game is either being laid out or running. There are no phases
 *  inside the live game; the clock is the structure. */
export type PhaseName = 'Deploy' | 'Live';

export interface EngineState {
  board: Board;
  pieces: Piece[];
  result: GameResult;
}

/** A reinforcement blip waiting for its entry's slot inside the cycle. */
interface PendingSpawn {
  /** First tick it may land. */
  due: number;
  /** Last tick it may land at its own entry; then any ranked entry, then dropped. */
  deadline: number;
  entry: Coord;
  fallbacks: Coord[];
}

/**
 * The rules orchestrator. In 2.x the game is a fixed-step simulation:
 * `tick()` advances it by one tick in a fixed order (regeneration, deferred
 * commands, marine default AI, stealer side, expiry sweep, cycle events,
 * the cycle boundary every TUNING.cycleTicks ticks, victory, `tick` event).
 * The engine never reads a clock; the client calls tick() on its interval
 * and tests call it directly. Player input arrives through `command()`.
 */
export class GameEngine {
  public readonly state: EngineState
  public readonly mission: CompiledMission
  /** Ticks completed since the mission went live. */
  tickCount = 0
  /** The cycle (turn-equivalent, TUNING.cycleTicks ticks) in progress, from 1. */
  cycle = 1
  /** 1.x name for the cycle; the log corpus and the HUD read it. */
  get turnNumber(): number { return this.cycle }
  phase: PhaseName = 'Live'
  /** Command points: 1d6 at construction and at every cycle boundary. */
  cp = 0
  /** Reinforcement blips already placed (counts against mission.totalBlips). */
  private blipsSpawned = 0
  private pendingSpawns: PendingSpawn[] = []
  /** Re-entrancy guard: a command issued from inside a tick (an event
   *  handler, say) is deferred to the next tick instead of nesting. */
  private inTick = false
  private deferred: { marineId: string; cmd: MarineCommand }[] = []
  /** Marines that left the board via an EXIT square (escape-family missions). */
  readonly escaped: Piece[] = []
  /** flame-objectives squares that have burned at least once ("x,y"); permanent. */
  readonly cleansed = new Set<string>()
  /** beta_2 download: counter 4 to 0 while a sergeant holds the Data Room. */
  downloadCounter = 4
  private downloadPieceId: string | null = null
  /** Squares the marines are trying to reach: the hive's objective awareness.
   *  Win RULES stay unknown to the AI; only the destination geography leaks. */
  private readonly hiveObjectives: { c: number; r: number }[] = []
  /** Marines lifted off the board during the deployment phase, deployment order. */
  readonly reserve: Piece[] = []
  /** id to mission deployment metadata, recorded as the squad is constructed. */
  private readonly deployMeta = new Map<string, { squad?: string; type: MarineType }>()
  private readonly entries: Coord[]

  constructor(mission: CompiledMission, extraPieces: Piece[] = [], dice?: DiceSource) {
    this.mission = mission
    const board = new Board(mission.width, mission.height, mission.squares)
    // A pinned dice source must be installed BEFORE deployment: initial blip
    // values and the first CP roll consume dice at construction time;
    // swapping the source afterwards leaves those rolls nondeterministic.
    if (dice) board.dice = dice
    this.state = { board, pieces: board.pieces as Piece[], result: 'ongoing' }
    for (const p of extraPieces) board.addPiece(p)

    // Deploy the marine squad: per-square marine type (original FORCES)
    const MARINE_CLASSES: Record<MarineType, new (b: Board, s: { c: number; r: number }, f: Dir) => Piece> = {
      storm_bolter: StormBolterMarine,
      sergeant: SergeantMarine,
      heavy_flamer: HeavyFlamerMarine,
      assault_cannon: AssaultCannonMarine,
      chain_fist: ChainFistMarine,
      sergeant_sword: SwordSergeantMarine,
    }
    for (const d of mission.marineDeployment ?? []) {
      const Cls = MARINE_CLASSES[d.type ?? 'storm_bolter']
      const marine = new Cls(board, { c: d.x, r: d.y }, FACING_WORD[d.facing ?? 'down'])
      this.deployMeta.set(marine.id, { squad: d.squad, type: d.type ?? 'storm_bolter' })
    }
    // Per-mission heavy-flamer ammo override (mission 6 post_deploy_script).
    if (mission.flamerAmmo !== undefined) {
      for (const m of this.marines) {
        if (m instanceof HeavyFlamerMarine) m.ammo = mission.flamerAmmo
      }
    }
    // Exotic board objects.
    if (mission.catStart) initCat(board, { c: mission.catStart.x, r: mission.catStart.y })
    if (mission.ductingSquares?.length) {
      initDucting(board, mission.ductingSquares.map(d => ({ c: d.x, r: d.y })))
    }
    this.downloadCounter = mission.downloadTurns ?? 4
    // Where the marines are HEADING, per mission geography: objective squares
    // to flame, exits to escape through, the data room, blockade entries
    // (kill-quota). Exterminate-style hunts have no destination; the hive
    // stays purely reactive there.
    const objs: { x: number; y: number }[] = []
    if (mission.objectivePoint) objs.push(mission.objectivePoint)
    objs.push(...(mission.objectivePoints ?? []))
    if (mission.downloadPoint) objs.push(mission.downloadPoint)
    objs.push(...(mission.exitPoints ?? []))
    if (mission.objective === 'kill-quota') objs.push(...(mission.entryPoints ?? []))
    this.hiveObjectives = objs.map(o => ({ c: o.x, r: o.y }))
    // Seed the first blips
    this.entries = (mission.entryPoints ?? []).map(e => ({ c: e.x, r: e.y }))
    if (this.entries.length && (mission.initialBlips ?? 0) > 0) {
      // cycle 1 here: the opening spawn already includes the feint stream (a
      // cheap standing threat from the entry nearest the marines).
      spawnBlips(board, this.entries, mission.initialBlips!, this.cycle, this.hiveObjectives)
    }
    this.rollCommandPoints()

    // Sulk rule: a blip converts the moment ANY marine sees it. Marine moves,
    // turns and door toggles change vision, so re-check on those events. The
    // rule is idempotent, so spurious triggers (e.g. events from another
    // engine instance in tests) are harmless; the marine-id guard keeps the
    // common path cheap.
    PieceEvents.on('pieceMoved', ({ pieceId }) => {
      if (PieceEvents.replaying || this.state.result !== 'ongoing') return
      // Deployment rotations are pre-game staging, not sight-line changes:
      // blips reveal (and downloads abort) only once the mission is live.
      if (this.phase === 'Deploy') return
      const mover = this.findPiece(pieceId)
      if (mover?.kind !== 'marine') return
      convertRevealedBlips(this.state.board)
      // A marine stepping onto the loose C.A.T. scoops it up (original:
      // possession pickup).
      const catPos = looseCatPos(this.state.board)
      if (catPos && catPos.c === mover.pos.c && catPos.r === mover.pos.r) {
        pickUpCat(this.state.board, mover)
      }
      // Escape-family missions: entering an EXIT square leaves the board.
      this.tryEscape(mover)
      // beta_2: the downloading sergeant MOVING aborts the download (original
      // post_action_script MOVING). tryTurn also emits pieceMoved (facing
      // change), so test that he actually LEFT the square; turning in place
      // is legal mid-download.
      if (this.mission.objective === 'download' && mover.id === this.downloadPieceId) {
        const dp = this.mission.downloadPoint
        if (!dp || mover.pos.c !== dp.x || mover.pos.r !== dp.y) {
          this.resetDownload()
        }
      }
    })
    PieceEvents.on('doorToggled', () => {
      if (PieceEvents.replaying || this.phase === 'Deploy') return
      if (this.state.result === 'ongoing') convertRevealedBlips(this.state.board)
    })
    // A door DESTROYED (bolter shot, cannon autofire, chain-fist cut) opens the
    // same sight lines as a door opened, but travels on its own event.
    PieceEvents.on('doorDestroyed', () => {
      if (PieceEvents.replaying || this.phase === 'Deploy') return
      if (this.state.result === 'ongoing') convertRevealedBlips(this.state.board)
    })
    // A death vacates a square, which can OPEN sight lines: a marine shooting
    // the stealer in front of a blip must flip that blip at once. Covers
    // shooting and close-combat kills. (The stealer side re-checks sight
    // itself after every one of its actions, so both halves stay required.)
    PieceEvents.on('pieceDied', () => {
      if (PieceEvents.replaying || this.phase === 'Deploy') return
      if (this.state.result === 'ongoing') convertRevealedBlips(this.state.board)
      // Kill-quota: the original announces victory at phase boundaries
      // (phases.py:774/973), but between the quota-reaching kill and the
      // boundary check NO enemy act occurs, so ending on the spot is
      // outcome-equivalent (and matches the original's running kill ticker).
      // Blockade is excluded here; positions are judged at the cycle boundary.
      if (this.mission.objective === 'kill-quota' && this.state.result === 'ongoing') {
        this.checkVictory({ blockade: false })
      }
    })
    // A flamed section can win the mission on the spot (flame-objective) and
    // flames change sight lines.
    PieceEvents.on('sectionFlamed', ({ shooterId }) => {
      if (PieceEvents.replaying || this.state.result !== 'ongoing') return
      convertRevealedBlips(this.state.board)
      // Mission 6 kludge, straight from the source (post_action_script): a
      // heavy flamer FIRING while standing in the control room wrecks a piece
      // of ducting: "this ensures the marines will lose this turn."
      if (this.mission.objective === 'defend') {
        const shooter = this.findPiece(shooterId)
        const rooms = this.mission.roomSquares ?? []
        if (shooter && rooms.some(r => r.x === shooter.pos.c && r.y === shooter.pos.r)) {
          const duct = intactDucting(this.state.board)[0]
          if (duct) destroyDuctingAt(this.state.board, duct)
        }
      }
      this.checkVictory()
    })
  }

  findPiece(id: string): Piece | undefined {
    return this.state.pieces.find(p => p.id === id)
  }

  /** Escape-family missions ('escort-cat', 'escape-count'): a marine standing
   *  on an EXIT square lurks off the board: removed from play, counted, and
   *  the C.A.T. leaves with its carrier (mission 3's win/draw trigger). */
  private tryEscape(marine: Piece): void {
    const objective = this.mission.objective
    if (objective !== 'escort-cat' && objective !== 'escape-count') return
    const exits = this.mission.exitPoints ?? []
    if (!exits.some(e => e.x === marine.pos.c && e.y === marine.pos.r)) return
    marine.alive = false
    this.state.board.removePiece(marine)
    this.escaped.push(marine)
    const cat = this.state.board.cat
    if (cat && cat.carrierId === marine.id) cat.escaped = true
    PieceEvents.emit('marineEscaped', { pieceId: marine.id, escaped: this.escaped.length })
    this.checkVictory()
  }

  get marines(): Piece[] {
    return this.state.pieces.filter(p => p.kind === 'marine')
  }

  get stealerSide(): Piece[] {
    return this.state.pieces.filter(p => p.kind !== 'marine')
  }

  // ---------- Deployment phase (pre-mission placement) ----------

  /**
   * Lift the whole squad into reserve and open the deployment phase. Client-
   * initiated: engines constructed for tests and attract mode never enter it,
   * so a fresh constructor game is byte-identical to today. Valid only before
   * anything has happened (no tick run, ongoing) and only for missions with
   * a real deployment (2+ squares). The board LOCKS; every normal piece
   * action is dead until finishDeployment. Consumes no dice.
   */
  beginDeployment(): boolean {
    if (this.state.result !== 'ongoing' || this.phase !== 'Live' || this.tickCount !== 0) return false
    if ((this.mission.marineDeployment ?? []).length < 2) return false
    for (const m of [...this.marines]) {
      this.state.board.removePiece(m)
      this.reserve.push(m)
    }
    this.state.board.locked = true
    this.setPhase('Deploy')
    return true
  }

  /** The mission deploy square at (x, y), if any. */
  deploySquareAt(x: number, y: number): DeploySquareJSON | undefined {
    return (this.mission.marineDeployment ?? []).find(d => d.x === x && d.y === y)
  }

  /** Squad a marine belongs to (mission roster grouping): the deployment rule key. */
  deploySquadOf(id: string): string | undefined {
    return this.deployMeta.get(id)?.squad
  }

  /**
   * Place a reserve marine on a free deploy square OF HIS SQUAD, facing the
   * square's mission default. Squares outside the deployment, occupied
   * squares, other squads' areas, and non-reserve marines all refuse.
   */
  deployMarine(id: string, x: number, y: number): boolean {
    if (this.phase !== 'Deploy') return false
    const idx = this.reserve.findIndex(m => m.id === id)
    if (idx < 0) return false
    const sq = this.deploySquareAt(x, y)
    if (!sq || this.state.board.isOccupied({ c: x, r: y })) return false
    if (this.deployMeta.get(id)?.squad !== sq.squad) return false
    const m = this.reserve[idx]
    this.reserve.splice(idx, 1)
    m.pos = { c: x, r: y }
    m.facing = deployFacing(sq)
    this.state.board.addPiece(m) // emits pieceAdded; the client sprite rides it
    return true
  }

  /** Pick a deployed marine back up into reserve, freeing his square. */
  undeployMarine(id: string): boolean {
    if (this.phase !== 'Deploy') return false
    const m = this.marines.find(p => p.id === id)
    if (!m) return false
    this.state.board.removePiece(m)
    this.reserve.push(m)
    return true
  }

  /** Rotate a deployed marine during deployment: free, no AP, no sight checks. */
  turnDeployed(id: string, dir: -1 | 1): boolean {
    if (this.phase !== 'Deploy') return false
    const m = this.marines.find(p => p.id === id)
    if (!m) return false
    m.facing = ((m.facing + dir + 4) % 4) as Dir
    PieceEvents.emit('pieceMoved', { pieceId: m.id, x: m.pos.c, y: m.pos.r, facing: m.facing })
    return true
  }

  /**
   * Fill every FREE deploy square with the remaining reserves in battle
   * order: per squad, front to back: storm bolter on point, sergeant second,
   * a heavy weapon third, the rest behind. Player placements are untouched.
   */
  autoDeploy(): void {
    if (this.phase !== 'Deploy') return
    const free = (this.mission.marineDeployment ?? [])
      .filter(d => !this.state.board.isOccupied({ c: d.x, r: d.y }))
    const bySquad = new Map<string | undefined, DeploySquareJSON[]>()
    for (const d of free) {
      const list = bySquad.get(d.squad) ?? []
      list.push(d)
      bySquad.set(d.squad, list)
    }
    for (const [squad, squares] of bySquad) {
      const ordered = orderSquaresFrontToBack(squares)
      const pool = this.reserve.filter(m => this.deployMeta.get(m.id)?.squad === squad)
      const order = autoDeployOrder(pool.map(m => this.deployMeta.get(m.id)?.type ?? 'storm_bolter'))
      for (let i = 0; i < ordered.length && i < order.length; i++) {
        this.deployMarine(pool[order[i]].id, ordered[i].x, ordered[i].y)
      }
    }
  }

  /**
   * Close the deployment phase: auto-deploy whatever is still in reserve
   * (timer expiry / Start), unlock the board, and go live.
   * Safety net: a reserve marine whose squad squares somehow ran out takes
   * any free deploy square rather than sitting out the mission in limbo.
   */
  finishDeployment(): void {
    if (this.phase !== 'Deploy') return
    this.autoDeploy()
    // Whatever is still in reserve (squad-less extraPieces marines, or a
    // marine whose squad squares were stolen: a stray piece parked on a
    // deploy square counts as occupied) MUST land: reserve is never
    // non-empty once the game is live, or the marine is stranded off-board
    // for the whole mission. Free deploy squares first, then the nearest
    // free passable square to his squad's deployment area.
    for (const m of [...this.reserve]) {
      const deploys = this.mission.marineDeployment ?? []
      let free: { x: number; y: number; facing?: 'up'|'right'|'down'|'left' } | undefined =
        deploys.find(d => !this.state.board.isOccupied({ c: d.x, r: d.y }))
      if (!free) {
        const anchor = deploys.find(d => d.squad === this.deployMeta.get(m.id)?.squad) ?? deploys[0]
        if (!anchor) break
        const cheb = (x: number, y: number) => Math.max(Math.abs(x - anchor.x), Math.abs(y - anchor.y))
        const fallback = this.state.board.allSquares()
          .filter(sq => this.state.board.isPassable({ c: sq.x, r: sq.y }, true)
            && !this.state.board.isOccupied({ c: sq.x, r: sq.y }))
          .sort((a, b) => cheb(a.x, a.y) - cheb(b.x, b.y))[0]
        if (!fallback) break // a board with zero free squares: nothing sane exists
        free = { x: fallback.x, y: fallback.y, facing: anchor.facing }
      }
      const idx = this.reserve.indexOf(m)
      this.reserve.splice(idx, 1)
      m.pos = { c: free.x, r: free.y }
      m.facing = deployFacing(free)
      this.state.board.addPiece(m)
    }
    this.state.board.locked = false
    this.setPhase('Live')
  }

  /** Spend one command point to give a marine one extra AP. */
  spendCP(marine: Piece): boolean {
    if (this.state.result !== 'ongoing' || this.phase !== 'Live') return false
    if (this.cp < 1 || marine.kind !== 'marine' || !marine.alive) return false
    this.cp -= 1
    marine.ap += 1
    PieceEvents.emit('cpChanged', { cp: this.cp })
    PieceEvents.emit('apChanged', { pieceId: marine.id, apRemaining: marine.apRemaining, apInitial: marine.apInitial })
    return true
  }

  // ---------- The clock ----------

  /** The hive's per-tick context: cycle for tactic rotation, the remaining
   *  blip budget (pending spawns already reserved), the marines' destinations. */
  private hiveContext() {
    return {
      turnNumber: this.cycle,
      blipsRemaining: this.mission.totalBlips === undefined
        ? undefined
        : Math.max(0, this.mission.totalBlips - this.blipsSpawned - this.pendingSpawns.length),
      objectives: this.hiveObjectives,
    }
  }

  /**
   * Advance the game by one tick. No-op while deploying or once the game is
   * over. Fixed order:
   *  1. AP regeneration for every piece (apChanged on each gain)
   *  2. commands deferred from inside the previous tick (normally none)
   *  3. marine default AI: one action per unleased marine with AP
   *  4. stealer side: one action per piece with AP under the cached plan
   *  5. expiry sweep: piece timers, flames, then the cycle's offset events
   *     (C.A.T. wander, download counter, ambush counter)
   *  6. cycle boundary every TUNING.cycleTicks ticks, then due reinforcements
   *  7. victory check (blockade judged only at the boundary)
   *  8. `tick` event
   * Marines regenerate and act before stealers: the deliberate marine edge
   * in a tie.
   */
  tick(): void {
    if (this.state.result !== 'ongoing' || this.phase !== 'Live') return
    const board = this.state.board
    this.tickCount += 1
    board.tick = this.tickCount
    this.inTick = true
    try {
      for (const p of [...this.state.pieces]) {
        if (p.regenerate()) {
          PieceEvents.emit('apChanged', { pieceId: p.id, apRemaining: p.apRemaining, apInitial: p.apInitial })
        }
      }
      for (const d of this.deferred.splice(0)) {
        const m = this.findPiece(d.marineId)
        if (m && m.kind === 'marine' && m.alive) this.applyCommand(m, d.cmd)
      }
      if (this.state.result !== 'ongoing') return
      runMarineAI(this)
      if (this.state.result !== 'ongoing') return
      stealerTick(board, this.hiveContext())
      if (this.state.result !== 'ongoing') return
      for (const p of [...this.state.pieces]) if (p.alive) p.onTick(this.tickCount)
      if (expireFlames(board) > 0) convertRevealedBlips(board)
      this.cycleEvents()
      if (this.state.result !== 'ongoing') return
      if (this.tickCount % TUNING.cycleTicks === 0) this.cycleBoundary()
      if (this.state.result !== 'ongoing') return
      this.placeDueSpawns()
      this.checkVictory({ blockade: false })
    } finally {
      // The tick event is part of the tick: a command issued from its
      // handler still defers to the next tick's step 2.
      PieceEvents.emit('tick', { tick: this.tickCount, cycle: this.cycle })
      this.inTick = false
    }
  }

  /** Run up to n ticks; stops early at game over. */
  runTicks(n: number): void {
    for (let i = 0; i < n && this.state.result === 'ongoing' && this.phase === 'Live'; i++) this.tick()
  }

  /**
   * TEST SHIM (stage 1 only). The 1.x "end the marine phase" call now runs
   * exactly one cycle of ticks, so the mission and victory specs written
   * against turns port by search and replace. Nothing in the client calls it.
   * Deleted in stage 2 along with runStealerActions.
   */
  endMarinePhase(): void {
    this.runTicks(TUNING.cycleTicks)
  }

  /** Cycle events at their offsets inside every cycle (tick 0 of the cycle
   *  is the boundary itself). Staggered so the hulk does not beat like a
   *  metronome: each event lands on its own tick. */
  private cycleEvents(): void {
    const board = this.state.board
    const t = this.tickCount % TUNING.cycleTicks
    if (t === TUNING.offsets.cat) {
      // The loose C.A.T. wanders once a cycle (original may_wander/update_autos).
      wanderCat(board)
    }
    if (t === TUNING.offsets.download && this.mission.objective === 'download' && this.mission.downloadPoint) {
      // beta_2 download tick (original end_script): a sergeant on the Data
      // Room square BEGINS the download at his first tick here; each further
      // cycle he remains decrements the counter. Anyone else there, or
      // nobody, resets.
      const dp = this.mission.downloadPoint
      const occupant = board.pieceAt({ c: dp.x, r: dp.y }) as Piece | undefined
      const sergeant = occupant instanceof SergeantMarine ? occupant : undefined
      if (sergeant) {
        if (this.downloadPieceId === sergeant.id) {
          this.downloadCounter -= 1
        } else {
          this.downloadPieceId = sergeant.id // download begins; counter holds
        }
        PieceEvents.emit('downloadChanged', { counter: this.downloadCounter, active: true })
        this.checkVictory()
      } else if (this.downloadPieceId !== null || this.downloadCounter !== (this.mission.downloadTurns ?? 4)) {
        this.resetDownload()
      }
    }
    if (t === TUNING.offsets.ambush && this.mission.useAmbushCounters && (this.mission.blipsPerTurn ?? 0) > 0) {
      // beta_2 ambush counters (original Stealer_Action_Phase._end): one per
      // cycle, at most two alive at once.
      deployAmbushCounter(board)
    }
  }

  /**
   * The cycle boundary: everything the 1.x end phase did once a turn, in the
   * original order. Defend's turn-limit win judges the cycle just closed;
   * the boundary victory check is the only one that judges the blockade
   * (positions "final" for the cycle); reinforcements are scheduled, not
   * placed; CP rolls; every close-in stealer turns to face its prey.
   */
  private cycleBoundary(): void {
    // Mission 6 marine win, an explicit END-PHASE check in the original
    // ("KLUDGE (endphase only)"): survive to the end of cycle `turnLimit`.
    if (this.mission.objective === 'defend' && this.cycle >= (this.mission.turnLimit ?? 16)) {
      this.finish('win')
      return
    }
    this.cycle += 1
    this.checkVictory()
    if (this.state.result !== 'ongoing') return
    this.scheduleSpawns()
    this.rollCommandPoints()
    chargeOrientation(this.state.board)
    this.setPhase('Live') // announces the new cycle (phaseChanged carries it)
  }

  /**
   * Reinforcements for the cycle just opened: min(blipsPerTurn, budget left)
   * blips, each booked into its entry's slot (entry index in the mission
   * list times TUNING.spawnOffsetTicks, inside the cycle) so successive
   * entries feed the hulk at different moments. Entry choice is the same
   * ranking spawnBlips uses (unseen first, strategic value, feint cadence).
   */
  private scheduleSpawns(): void {
    if (!this.entries.length || !((this.mission.blipsPerTurn ?? 0) > 0)) return
    const budget = this.mission.totalBlips ?? Infinity
    const count = Math.min(this.mission.blipsPerTurn!, Math.max(0, budget - this.blipsSpawned - this.pendingSpawns.length))
    if (count <= 0) return
    const ordered = rankEntries(this.state.board, this.entries, this.cycle, this.hiveObjectives)
    if (ordered.length === 0) return
    for (let n = 0; n < count; n++) {
      const entry = ordered[n % ordered.length]
      const idx = this.entries.findIndex(e => e.c === entry.c && e.r === entry.r)
      const offset = (Math.max(0, idx) * TUNING.spawnOffsetTicks) % TUNING.cycleTicks
      this.pendingSpawns.push({
        due: this.tickCount + offset,
        deadline: this.tickCount + TUNING.cycleTicks - 1,
        entry,
        fallbacks: ordered,
      })
    }
  }

  /** Land every booked blip whose slot has come. A blocked entry retries
   *  each tick until the cycle's last tick, then takes any free ranked entry,
   *  else the blip is dropped (never charged to the budget). A blip born in
   *  sight converts on the spot. */
  private placeDueSpawns(): void {
    if (this.pendingSpawns.length === 0) return
    const board = this.state.board
    const free = (c: Coord) => board.isPassable(c) && !board.isOccupied(c)
    let placed = false
    const keep: PendingSpawn[] = []
    for (const s of this.pendingSpawns) {
      if (s.due > this.tickCount) { keep.push(s); continue }
      let spot: Coord | undefined = free(s.entry) ? s.entry : undefined
      if (!spot && this.tickCount >= s.deadline) spot = s.fallbacks.find(free)
      if (!spot) {
        if (this.tickCount < s.deadline) keep.push(s)
        continue
      }
      new Blip(board, { ...spot })
      this.blipsSpawned += 1
      placed = true
    }
    this.pendingSpawns = keep
    if (placed) convertRevealedBlips(board)
  }

  // ---------- Player commands ----------

  /**
   * Apply a player command to a marine at once (between ticks) and log it
   * against the tick it followed. The one way the client acts on the board:
   * every key and click becomes a MarineCommand. Refuses when the game is
   * not live, the board is locked, or the id is not a living marine. Issued
   * from inside a tick (an event handler), it is deferred to the next tick's
   * step 2 and reported as accepted.
   */
  command(marineId: string, cmd: MarineCommand): boolean {
    if (this.state.result !== 'ongoing' || this.phase !== 'Live' || this.state.board.locked) return false
    const m = this.findPiece(marineId)
    if (!m || m.kind !== 'marine' || !m.alive) return false
    if (this.inTick) {
      this.deferred.push({ marineId, cmd })
      return true
    }
    return this.applyCommand(m, cmd)
  }

  private applyCommand(m: Piece, cmd: MarineCommand): boolean {
    m.lastCommandTick = this.tickCount
    const ok = this.execute(m, cmd)
    PieceEvents.emit('command', { tick: this.tickCount, pieceId: m.id, command: cmd, ok })
    if (ok) {
      PieceEvents.emit('apChanged', { pieceId: m.id, apRemaining: m.apRemaining, apInitial: m.apInitial })
      this.checkVictory({ blockade: false }) // e.g. the marine stepped onto the exit
    }
    return ok
  }

  /** The command table: each command reaches exactly one piece method, and
   *  "acted" means the piece spent something (AP, ammo, a free shot) or
   *  changed state; a refused action returns false with nothing spent. */
  private execute(m: Piece, cmd: MarineCommand): boolean {
    const board = this.state.board
    const bolter = m instanceof StormBolterMarine ? m : undefined
    switch (cmd.type) {
      case 'move':
        switch (cmd.dir) {
          case 'forward': return m.moveForward()
          case 'backward': return m.moveBackward()
          case 'forwardLeft': return m.moveForwardLeft()
          case 'forwardRight': return m.moveForwardRight()
          case 'backLeft': return m.moveBackLeft()
          case 'backRight': return m.moveBackRight()
        }
        return false
      case 'turn': return m.tryTurn(cmd.delta)
      case 'door': return m.useDoor()
      case 'shoot': {
        const target = this.findPiece(cmd.targetId)
        if (!bolter || !target || !bolter.canShootPiece(target)) return false
        bolter.shoot(target)
        return true // AP spent even on a miss
      }
      case 'shootDoor': {
        const door = board.doorsAt({ c: cmd.x, r: cmd.y }).find(d => d.facing === cmd.facing)
        if (!bolter || !bolter.canShootDoor(door)) return false
        bolter.shootDoor(door)
        return true
      }
      case 'flame': {
        if (!(m instanceof HeavyFlamerMarine)) return false
        const sq = board.get(cmd.x, cmd.y)
        if (!m.canFlame(sq)) return false
        return m.flameAt(sq) !== undefined
      }
      case 'melee': {
        const v = DIR_VEC[m.facing]
        const defender = board.pieceAt({ c: m.pos.c + v.dc, r: m.pos.r + v.dr }) as Piece | undefined
        if (!defender) return false
        return closeCombat(m, defender) !== undefined
      }
      case 'overwatch':
        if (!bolter) return false
        if (cmd.on) return bolter.overwatchOn()
        if (!bolter.overwatch) return false
        bolter.overwatchOff()
        return true
      case 'unjam': return bolter?.unjam() ?? false
      case 'selfDestruct': return m instanceof HeavyFlamerMarine && m.selfDestruct()
      case 'autofire': return m instanceof AssaultCannonMarine && m.autofire()
      case 'reload': return m instanceof AssaultCannonMarine && m.reload()
      case 'cutDoor': return m instanceof ChainFistMarine && m.cutDoor()
      case 'cp': return this.spendCP(m)
    }
    return false
  }

  /**
   * Determinism probe: a short hash of everything that matters to play
   * (clock, CP, result, every piece's position, facing, AP and weapon state,
   * every door, every flame). Two engines from one seed and one command log
   * agree on it at every tick, or replay is broken.
   */
  stateHash(): string {
    const board = this.state.board
    const parts: string[] = [`t${this.tickCount}c${this.cycle}cp${this.cp}r${this.state.result}`]
    // Board order, no ids: piece ids come from a process-wide counter, so two
    // engines in one process never share them, while their board order is
    // the same deterministic insertion order.
    for (const p of this.state.pieces) {
      const w = p as StormBolterMarine & HeavyFlamerMarine & AssaultCannonMarine
      parts.push(`${p.spriteKey}@${p.pos.c},${p.pos.r}f${p.facing}a${p.ap}` +
        `o${w.overwatch ? 1 : 0}j${w.jammed ? 1 : 0}m${w.ammo ?? '-'}`)
    }
    for (const d of board.allDoors()) parts.push(`d${d.square.x},${d.square.y},${d.facing}:${d.isOpen ? 1 : 0}${d.destroyed ? 'x' : ''}`)
    for (const [k, exp] of board.flaming) parts.push(`F${k}:${exp}`)
    // FNV-1a over the joined text keeps the probe short and stable.
    let h = 0x811c9dc5
    for (const ch of parts.join('|')) {
      h ^= ch.charCodeAt(0)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h.toString(16).padStart(8, '0')
  }

  /** Evaluate the mission objective. `blockade: false` skips the kill-quota
   *  entry blockade, which is judged only at the cycle boundary. */
  checkVictory(opts: { blockade?: boolean } = {}): void {
    if (this.state.result !== 'ongoing') return
    // A marine-free board during deployment is a squad in reserve, not a wipe.
    if (this.phase === 'Deploy') return
    const objective = this.mission.objective ?? 'exterminate'
    const marinesAlive = this.marines.length > 0

    if (objective === 'flame-objective') {
      // Original Suicide Mission: win the moment the objective square burns;
      // lose the moment no living flamer has ammo left (squad wipe implies it).
      const obj = this.mission.objectivePoint
      if (obj && this.state.board.isFlaming({ c: obj.x, r: obj.y })) {
        this.finish('win')
        return
      }
      const flamerViable = this.marines.some(
        m => m instanceof HeavyFlamerMarine && m.ammo > 0
      )
      if (!flamerViable) this.finish('loss')
      return
    }

    if (objective === 'escort-cat') {
      // Original mission 3 victory_check: no cat / cat destroyed / squad dead
      // = stealers; a lurking (escaped) carrier with the cat = marines if the
      // cat is undamaged, DRAW if damaged; otherwise the game goes on.
      const cat = this.state.board.cat
      if (!cat || cat.destroyed) {
        this.finish('loss')
        return
      }
      if (cat.escaped) {
        this.finish(cat.damaged ? 'draw' : 'win')
        return
      }
      // Adaptation (documented): with every marine dead the cat can never be
      // carried out; call it there rather than letting the game hang.
      if (!marinesAlive) this.finish('loss')
      return
    }

    if (objective === 'flame-objectives') {
      // Original mission 4: a flaming objective square is permanently
      // "cleansed"; all cleansed = marines; no flamer with ammo = stealers.
      const points = this.mission.objectivePoints ?? []
      for (const p of points) {
        const key = `${p.x},${p.y}`
        if (!this.cleansed.has(key) && this.state.board.isFlaming({ c: p.x, r: p.y })) {
          this.cleansed.add(key)
          PieceEvents.emit('objectiveCleansed', { x: p.x, y: p.y, cleansedCount: this.cleansed.size })
        }
      }
      if (points.length > 0 && points.every(p => this.cleansed.has(`${p.x},${p.y}`))) {
        this.finish('win')
        return
      }
      const flamerViable = this.marines.some(m => m instanceof HeavyFlamerMarine && m.ammo > 0)
      if (!flamerViable) this.finish('loss')
      return
    }

    if (objective === 'escape-count') {
      // Original mission 5 / beta 1: quota of lurking marines wins; the squad
      // shrinking below the quota (dead marines don't lurk) loses.
      const quota = this.mission.escapeQuota ?? 1
      if (this.escaped.length >= quota) {
        this.finish('win')
        return
      }
      if (this.marines.length + this.escaped.length < quota) this.finish('loss')
      return
    }

    if (objective === 'defend') {
      // Original mission 6: stealers win on any ducting destroyed, any
      // control-room square flaming, or a squad wipe. The turn-limit marine
      // win is a cycle-boundary check (cycleBoundary).
      const board = this.state.board
      if (anyDuctingDestroyed(board)) {
        this.finish('loss')
        return
      }
      const rooms = this.mission.roomSquares ?? []
      if (rooms.some(r => board.isFlaming({ c: r.x, r: r.y }))) {
        this.finish('loss')
        return
      }
      if (!marinesAlive) this.finish('loss')
      return
    }

    if (objective === 'download') {
      // Original beta_2 victory_check: no sergeant of either type = stealers;
      // counter at zero = marines. No draw.
      const sergeantAlive = this.marines.some(m => m instanceof SergeantMarine)
      if (!sergeantAlive) {
        this.finish('loss')
        return
      }
      if (this.downloadCounter <= 0) this.finish('win')
      return
    }

    if (objective === 'kill-quota') {
      // Original mission 2 "Exterminate" (victory_check): quota first, then
      // entry blockade, then squad wipe. Blips credit their VALUE (counted in
      // Piece.die); blockade = a marine within 6 board-graph squares of EVERY
      // entry square (get_team_is_near semantics: walls block, doors don't).
      const board = this.state.board
      if (board.stealerCasualties >= (this.mission.killQuota ?? 30)) {
        this.finish('win')
        return
      }
      const entries = this.mission.entryPoints ?? []
      const blockaded = (opts.blockade ?? true) && entries.length > 0 && entries.every(e =>
        board.pieceNear({ c: e.x, r: e.y }, 6, p => (p as Piece).kind === 'marine'))
      if (blockaded) {
        this.finish('win')
        return
      }
      if (!marinesAlive) this.finish('loss')
      return
    }

    if (!marinesAlive) {
      this.finish('loss')
      return
    }
    const exits = this.mission.exitPoints ?? []
    const marineAtExit = this.marines.some(m => exits.some(e => e.x === m.pos.c && e.y === m.pos.r))
    // Extermination means the hulk is EMPTY: nothing on the board, nothing
    // booked for this cycle, and nothing left in the reinforcement budget.
    // (1.x checked only at phase ends, after the spawn; a per-tick check
    // would otherwise read the empty opening board of a trickle mission as
    // a win, the debug_1 regression.)
    const stealersGone = this.stealerSide.length === 0 && this.pendingSpawns.length === 0
      && !this.reinforcementsLeft()
    const win =
      (objective === 'exterminate' && stealersGone) ||
      (objective === 'reach-exit' && marineAtExit) ||
      (objective === 'exterminate-or-exit' && (stealersGone || marineAtExit))
    if (win) this.finish('win')
  }

  /** More reinforcements can still arrive: entries exist, the mission
   *  trickles blips, and the budget (if any) is not spent. */
  private reinforcementsLeft(): boolean {
    if (this.entries.length === 0 || !((this.mission.blipsPerTurn ?? 0) > 0)) return false
    if (this.mission.totalBlips === undefined) return true
    return this.mission.totalBlips - this.blipsSpawned - this.pendingSpawns.length > 0
  }

  private finish(result: GameResult): void {
    this.state.result = result
    this.state.board.locked = true
    PieceEvents.emit('gameOver', { result })
  }

  private rollCommandPoints(): void {
    this.cp = this.state.board.dice.roll()
    PieceEvents.emit('cpChanged', { cp: this.cp })
  }

  /** Abort/reset the beta_2 download: clear the downloader, restore the counter, announce. */
  private resetDownload(): void {
    this.downloadPieceId = null
    this.downloadCounter = this.mission.downloadTurns ?? 4
    PieceEvents.emit('downloadChanged', { counter: this.downloadCounter, active: false })
  }

  private setPhase(phase: PhaseName): void {
    this.phase = phase
    PieceEvents.emit('phaseChanged', { phase, turn: this.cycle })
  }
}
