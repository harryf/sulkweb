import { Piece } from './pieces/Piece.js';
import { StormBolterMarine, SergeantMarine, SwordSergeantMarine } from './pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from './pieces/HeavyFlamerMarine.js';
import { AssaultCannonMarine, ChainFistMarine } from './pieces/AssaultCannonMarine.js';
import { deployAmbushCounter } from './pieces/AmbushCounter.js';
import { Board } from './board/Board.js'
import type { CompiledMission, MarineType } from './missions/missionTypes.js'
import { Dir, FACING_WORD } from './core/Direction.js';
import { runStealerActions, spawnBlips, convertRevealedBlips } from './ai/StealerAI.js';
import { clearFlames } from './rules/flame.js';
import { deployFacing, orderSquaresFrontToBack, autoDeployOrder } from './rules/deploy.js';
import type { DeploySquareJSON } from './missions/missionTypes.js';
import {
  initCat, initDucting, looseCatPos, pickUpCat, wanderCat,
  anyDuctingDestroyed, destroyDuctingAt, intactDucting,
} from './rules/exotic.js';
import { PieceEvents } from './events/PieceEvents.js';
import type { DiceSource } from './core/Dice.js';

export type GameResult = 'ongoing' | 'win' | 'loss' | 'draw';
export type PhaseName = 'Deploy' | 'MarineAction' | 'StealerAction';

export interface EngineState {
  board: Board;
  pieces: Piece[];
  result: GameResult;
}


/** Base marine-phase clock (original TURNTIMER_BASE_TIME); sergeants add 30s each. */
export const MARINE_PHASE_SECONDS = 120;

export class GameEngine {
  public readonly state: EngineState
  public readonly mission: CompiledMission
  turnNumber = 1
  phase: PhaseName = 'MarineAction'
  /** Command points — rolled 1d6 at the start of each marine turn. */
  cp = 0
  /** Reinforcement blips already spawned (counts against mission.totalBlips). */
  private blipsSpawned = 0
  /** Marines that left the board via an EXIT square (escape-family missions). */
  readonly escaped: Piece[] = []
  /** flame-objectives squares that have burned at least once ("x,y") — permanent. */
  readonly cleansed = new Set<string>()
  /** beta_2 download: counter 4→0 while a sergeant holds the Data Room. */
  downloadCounter = 4
  private downloadPieceId: string | null = null
  /** Squares the marines are trying to reach — the hive's objective awareness.
   *  Win RULES stay unknown to the AI; only the destination geography leaks. */
  private readonly hiveObjectives: { c: number; r: number }[] = []
  /** Marines lifted off the board during the deployment phase, deployment order. */
  readonly reserve: Piece[] = []
  /** id → mission deployment metadata, recorded as the squad is constructed. */
  private readonly deployMeta = new Map<string, { squad?: string; type: MarineType }>()

  constructor(mission: CompiledMission, extraPieces: Piece[] = [], dice?: DiceSource) {
    this.mission = mission
    const board = new Board(mission.width, mission.height, mission.squares)
    // A pinned dice source must be installed BEFORE deployment: initial blip
    // values and the first CP roll consume dice at construction time —
    // swapping the source afterwards leaves those rolls nondeterministic.
    if (dice) board.dice = dice
    this.state = { board, pieces: board.pieces as Piece[], result: 'ongoing' }
    for (const p of extraPieces) board.addPiece(p)

    // Deploy the marine squad — per-square marine type (original FORCES)
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
    // (kill-quota). Exterminate-style hunts have no destination — the hive
    // stays purely reactive there.
    const objs: { x: number; y: number }[] = []
    if (mission.objectivePoint) objs.push(mission.objectivePoint)
    objs.push(...(mission.objectivePoints ?? []))
    if (mission.downloadPoint) objs.push(mission.downloadPoint)
    objs.push(...(mission.exitPoints ?? []))
    if (mission.objective === 'kill-quota') objs.push(...(mission.entryPoints ?? []))
    this.hiveObjectives = objs.map(o => ({ c: o.x, r: o.y }))
    // Seed the first blips
    const entries = (mission.entryPoints ?? []).map(e => ({ c: e.x, r: e.y }))
    if (entries.length && (mission.initialBlips ?? 0) > 0) {
      // turnNumber is 1 here — the opening spawn already includes the feint
      // stream (a cheap standing threat from the entry nearest the marines).
      spawnBlips(board, entries, mission.initialBlips!, this.turnNumber, this.hiveObjectives)
    }
    this.rollCommandPoints()

    // Sulk rule: a blip converts the moment ANY marine sees it — not just at
    // phase boundaries. Marine moves/turns and door toggles change vision, so
    // re-check on those events. The rule is idempotent, so spurious triggers
    // (e.g. events from another engine instance in tests) are harmless; the
    // marine-id guard keeps the common path cheap.
    PieceEvents.on('pieceMoved', ({ pieceId }) => {
      if (PieceEvents.replaying || this.state.result !== 'ongoing') return
      // Deployment rotations are pre-game staging, not sight-line changes:
      // blips reveal (and downloads abort) only once the mission is live —
      // the same state a freshly-constructed game starts in.
      if (this.phase === 'Deploy') return
      const mover = this.findPiece(pieceId)
      if (mover?.kind !== 'marine') return
      convertRevealedBlips(this.state.board)
      // A marine stepping onto the loose C.A.T. scoops it up (original:
      // possession pickup). Marines move only in the live marine phase, so an
      // event handler is safe here (capture() only wraps endMarinePhase).
      const catPos = looseCatPos(this.state.board)
      if (catPos && catPos.c === mover.pos.c && catPos.r === mover.pos.r) {
        pickUpCat(this.state.board, mover)
      }
      // Escape-family missions: entering an EXIT square leaves the board.
      this.tryEscape(mover)
      // beta_2: the downloading sergeant MOVING aborts the download (original
      // post_action_script MOVING). tryTurn also emits pieceMoved (facing
      // change), so test that he actually LEFT the square — turning in place
      // is legal mid-download.
      if (this.mission.objective === 'download' && mover.id === this.downloadPieceId) {
        const dp = this.mission.downloadPoint
        if (!dp || mover.pos.c !== dp.x || mover.pos.r !== dp.y) {
          this.resetDownload()
        }
      }
    })
    PieceEvents.on('doorToggled', () => {
      if (PieceEvents.replaying || this.phase === 'Deploy') return // replays and pre-game staging — not new sight lines
      if (this.state.result === 'ongoing') convertRevealedBlips(this.state.board)
    })
    // A door DESTROYED (bolter shot, cannon autofire, chain-fist cut) opens the
    // same sight lines as a door opened, but travels on its own event. Stealers
    // never destroy doors, so this never fires inside the captured stealer phase.
    PieceEvents.on('doorDestroyed', () => {
      if (PieceEvents.replaying || this.phase === 'Deploy') return
      if (this.state.result === 'ongoing') convertRevealedBlips(this.state.board)
    })
    // A death vacates a square, which can OPEN sight lines: a marine shooting
    // the stealer in front of a blip must flip that blip at once. Covers
    // shooting and close-combat kills in the marine phase. (Stealer-phase
    // deaths happen inside capture(), where handlers are suppressed —
    // runStealerActions re-checks sight itself after every AI action.)
    PieceEvents.on('pieceDied', () => {
      if (PieceEvents.replaying || this.phase === 'Deploy') return
      if (this.state.result === 'ongoing') convertRevealedBlips(this.state.board)
      // Kill-quota: the original announces victory at phase boundaries
      // (phases.py:774/973), but between the quota-reaching kill and the
      // marine-action-end check NO enemy act occurs, so ending on the spot is
      // outcome-equivalent (and matches the original's running kill ticker).
      // Blockade is excluded here — positions aren't final until phase end.
      // Stealer-phase deaths happen inside capture() (handlers suppressed) —
      // endMarinePhase re-checks. Other objectives keep boundary-only timing.
      if (this.mission.objective === 'kill-quota' && this.state.result === 'ongoing') {
        this.checkVictory({ blockade: false })
      }
    })
    // A flamed section can win the mission on the spot (flame-objective) and
    // flames change sight lines. Stealers never flame, so this never fires
    // inside the captured stealer phase.
    PieceEvents.on('sectionFlamed', ({ shooterId }) => {
      if (PieceEvents.replaying || this.state.result !== 'ongoing') return
      convertRevealedBlips(this.state.board)
      // Mission 6 kludge, straight from the source (post_action_script): a
      // heavy flamer FIRING while standing in the control room wrecks a piece
      // of ducting — "this ensures the marines will lose this turn."
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
   *  on an EXIT square lurks off the board — removed from play, counted, and
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

  /** Marine-phase clock: 120s base + 30s per living sergeant (original timer_bonus). */
  get marinePhaseSeconds(): number {
    return MARINE_PHASE_SECONDS + this.marines.reduce((s, m) => s + m.timerBonus, 0)
  }

  // ---------- Deployment phase (pre-mission placement) ----------

  /**
   * Lift the whole squad into reserve and open the deployment phase. Client-
   * initiated: engines constructed for tests and attract mode never enter it,
   * so a fresh constructor game is byte-identical to today. Valid only before
   * anything has happened (turn 1, marine phase, ongoing) and only for
   * missions with a real deployment (2+ squares). The board LOCKS — every
   * normal piece action is dead until finishDeployment. Consumes no dice.
   */
  beginDeployment(): boolean {
    if (this.state.result !== 'ongoing' || this.phase !== 'MarineAction' || this.turnNumber !== 1) return false
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

  /** Squad a marine belongs to (mission roster grouping) — deployment rule key. */
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
    this.state.board.addPiece(m) // emits pieceAdded — the client sprite rides it
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

  /** Rotate a deployed marine during deployment — free, no AP, no sight checks. */
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
   * order — per squad, front to back: storm bolter on point, sergeant second,
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
   * (timer expiry / Done), unlock the board, and start the marine phase.
   * Safety net: a reserve marine whose squad squares somehow ran out takes
   * any free deploy square rather than sitting out the mission in limbo.
   */
  finishDeployment(): void {
    if (this.phase !== 'Deploy') return
    this.autoDeploy()
    // Whatever is still in reserve — squad-less extraPieces marines, or a
    // marine whose squad squares were stolen (a stray piece parked on a
    // deploy square counts as occupied) — MUST land: reserve is never
    // non-empty once the phase is MarineAction, or the marine is stranded
    // off-board for the whole mission. Free deploy squares first, then the
    // nearest free passable square to his squad's deployment area.
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
        if (!fallback) break // a board with zero free squares — nothing sane exists
        free = { x: fallback.x, y: fallback.y, facing: anchor.facing }
      }
      const idx = this.reserve.indexOf(m)
      this.reserve.splice(idx, 1)
      m.pos = { c: free.x, r: free.y }
      m.facing = deployFacing(free)
      this.state.board.addPiece(m)
    }
    this.state.board.locked = false
    this.setPhase('MarineAction')
  }

  /** Spend one command point to give a marine one extra AP (also re-activates a spent piece). */
  spendCP(marine: Piece): boolean {
    if (this.state.result !== 'ongoing' || this.phase !== 'MarineAction') return false
    if (this.cp < 1 || marine.kind !== 'marine' || !marine.alive) return false
    this.cp -= 1
    marine.ap += 1
    PieceEvents.emit('cpChanged', { cp: this.cp })
    PieceEvents.emit('apChanged', { pieceId: marine.id, apRemaining: marine.apRemaining, apInitial: marine.apInitial })
    return true
  }

  /**
   * End the marine phase (Done button or timer expiry) and run the rest of the
   * turn synchronously: reinforcements → stealer actions → end phase (flame
   * dispersal, victory checks, AP refresh) → new turn.
   */
  endMarinePhase(): void {
    if (this.state.result !== 'ongoing' || this.phase !== 'MarineAction') return

    // Marine-action-end victory check (original phases.py:774) — a quota or
    // blockade achieved in the marine phase must resolve BEFORE the stealers
    // get their turn, with marine positions final. Kill-quota only: the
    // adapted exterminate/exit objectives read "no stealers on the board" as a
    // win, which would fire spuriously here before the first reinforcements.
    if (this.mission.objective === 'kill-quota') {
      this.checkVictory()
      if (this.state.result !== 'ongoing') return
    }

    this.setPhase('StealerAction')
    const board = this.state.board
    const entries = (this.mission.entryPoints ?? []).map(e => ({ c: e.x, r: e.y }))

    // Reinforcement phase — bounded by the mission's total genestealer force.
    // Entries are chosen strategically (see spawnBlips): the bulk arrives
    // near the marines' destination, rotated per turn, with a periodic feint
    // spawn from the entry nearest the marines.
    if (entries.length && (this.mission.blipsPerTurn ?? 0) > 0) {
      const budget = this.mission.totalBlips ?? Infinity
      const count = Math.min(this.mission.blipsPerTurn!, Math.max(0, budget - this.blipsSpawned))
      if (count > 0) {
        this.blipsSpawned += spawnBlips(board, entries, count, this.turnNumber, this.hiveObjectives).length
      }
    }
    convertRevealedBlips(board)

    // Stealer action phase (AI) — the hive plans with the turn number (tactic
    // rotation), the remaining blip budget (wave sizing vs. respawn rate) and
    // the marines' destination squares (urgency: reckless when they get close).
    runStealerActions(board, {
      turnNumber: this.turnNumber,
      blipsRemaining: this.mission.totalBlips === undefined
        ? undefined
        : Math.max(0, this.mission.totalBlips - this.blipsSpawned),
      objectives: this.hiveObjectives,
    })

    // beta_2 ambush counters deploy at the END of the stealer phase (original
    // Stealer_Action_Phase._end): one per turn, at most two alive at once.
    if (this.mission.useAmbushCounters && (this.mission.blipsPerTurn ?? 0) > 0
        && this.state.result === 'ongoing') {
      deployAmbushCounter(board)
    }

    // beta_2 download tick (original end_script): a sergeant on the Data Room
    // square BEGINS the download at his first end-phase; each further one he
    // remains decrements the counter. Anyone else there — or nobody — resets.
    if (this.mission.objective === 'download' && this.mission.downloadPoint) {
      const dp = this.mission.downloadPoint
      const occupant = board.pieceAt({ c: dp.x, r: dp.y }) as Piece | undefined
      const sergeant = occupant instanceof SergeantMarine ? occupant : undefined
      if (sergeant) {
        if (this.downloadPieceId === sergeant.id) {
          this.downloadCounter -= 1
        } else {
          this.downloadPieceId = sergeant.id // download begins — counter holds
        }
        PieceEvents.emit('downloadChanged', { counter: this.downloadCounter, active: true })
      } else if (this.downloadPieceId !== null || this.downloadCounter !== (this.mission.downloadTurns ?? 4)) {
        this.resetDownload()
      }
    }

    // End phase: victory checks BEFORE flame dispersal (a burning objective is
    // a win), then flames go out (original `persist = False`) and the freed
    // sight lines are re-checked.
    this.checkVictory()
    if (this.state.result !== 'ongoing') return
    clearFlames(board)
    convertRevealedBlips(board)
    // The loose C.A.T. wanders in the end phase (original may_wander/update_autos).
    wanderCat(board)
    this.checkVictory()
    if (this.state.result !== 'ongoing') return

    // Mission 6 marine win — an explicit END-PHASE check in the original
    // ("KLUDGE (endphase only)"): survive to the end of turn `turnLimit`.
    if (this.mission.objective === 'defend' && this.turnNumber >= (this.mission.turnLimit ?? 16)) {
      this.finish('win')
      return
    }

    this.turnNumber += 1
    for (const p of this.state.pieces) {
      p.resetAP()
      PieceEvents.emit('apChanged', { pieceId: p.id, apRemaining: p.apRemaining, apInitial: p.apInitial })
    }
    this.rollCommandPoints()
    this.setPhase('MarineAction')
  }

  /** Evaluate the mission objective. Also fired when pieces die mid-phase
   *  (kill-quota only — with `blockade: false`, since positions aren't final
   *  until the phase boundary). */
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
      // → stealers; a lurking (escaped) carrier with the cat → marines if the
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
      // carried out — call it there rather than letting the game hang.
      if (!marinesAlive) this.finish('loss')
      return
    }

    if (objective === 'flame-objectives') {
      // Original mission 4: a flaming objective square is permanently
      // "cleansed"; all cleansed → marines; no flamer with ammo → stealers.
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
      // control-room square flaming, or a squad wipe. The turn-16 marine win
      // is an END-PHASE check — it lives in endMarinePhase.
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
      // Original beta_2 victory_check: no sergeant of either type → stealers;
      // counter at zero → marines. No draw.
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
      // entry square (get_team_is_near semantics — walls block, doors don't).
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
    const stealersGone = this.stealerSide.length === 0
    const win =
      (objective === 'exterminate' && stealersGone) ||
      (objective === 'reach-exit' && marineAtExit) ||
      (objective === 'exterminate-or-exit' && (stealersGone || marineAtExit))
    if (win) this.finish('win')
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
    PieceEvents.emit('phaseChanged', { phase, turn: this.turnNumber })
  }
}
