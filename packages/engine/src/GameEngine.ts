import { Piece } from './pieces/Piece.js';
import { StormBolterMarine, SergeantMarine } from './pieces/StormBolterMarine.js';
import { HeavyFlamerMarine } from './pieces/HeavyFlamerMarine.js';
import { Board } from './board/Board.js'
import type { CompiledMission, MarineType } from './missions/missionTypes.js'
import { Dir } from './core/Direction.js';
import { runStealerActions, spawnBlips, convertRevealedBlips } from './ai/StealerAI.js';
import { clearFlames } from './rules/flame.js';
import {
  initCat, initDucting, looseCatPos, pickUpCat, wanderCat,
  anyDuctingDestroyed, destroyDuctingAt, intactDucting,
} from './rules/exotic.js';
import { PieceEvents } from './events/PieceEvents.js';
import type { DiceSource } from './core/Dice.js';

export type GameResult = 'ongoing' | 'win' | 'loss' | 'draw';
export type PhaseName = 'MarineAction' | 'StealerAction';

export interface EngineState {
  board: Board;
  pieces: Piece[];
  result: GameResult;
}

const FACING: Record<string, Dir> = { up: Dir.N, right: Dir.E, down: Dir.S, left: Dir.W };

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
    }
    for (const d of mission.marineDeployment ?? []) {
      const Cls = MARINE_CLASSES[d.type ?? 'storm_bolter']
      new Cls(board, { c: d.x, r: d.y }, FACING[d.facing ?? 'down'])
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
    // Seed the first blips
    const entries = (mission.entryPoints ?? []).map(e => ({ c: e.x, r: e.y }))
    if (entries.length && (mission.initialBlips ?? 0) > 0) {
      spawnBlips(board, entries, mission.initialBlips!)
    }
    this.rollCommandPoints()

    // Sulk rule: a blip converts the moment ANY marine sees it — not just at
    // phase boundaries. Marine moves/turns and door toggles change vision, so
    // re-check on those events. The rule is idempotent, so spurious triggers
    // (e.g. events from another engine instance in tests) are harmless; the
    // marine-id guard keeps the common path cheap.
    PieceEvents.on('pieceMoved', ({ pieceId }) => {
      if (PieceEvents.replaying || this.state.result !== 'ongoing') return
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
    })
    PieceEvents.on('doorToggled', () => {
      if (PieceEvents.replaying) return // animation replays past events — not new sight lines
      if (this.state.result === 'ongoing') convertRevealedBlips(this.state.board)
    })
    // A death vacates a square, which can OPEN sight lines: a marine shooting
    // the stealer in front of a blip must flip that blip at once. Covers
    // shooting and close-combat kills in the marine phase. (Stealer-phase
    // deaths happen inside capture(), where handlers are suppressed —
    // runStealerActions re-checks sight itself after every AI action.)
    PieceEvents.on('pieceDied', () => {
      if (PieceEvents.replaying) return
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

    // Reinforcement phase — bounded by the mission's total genestealer force
    if (entries.length && (this.mission.blipsPerTurn ?? 0) > 0) {
      const budget = this.mission.totalBlips ?? Infinity
      const count = Math.min(this.mission.blipsPerTurn!, Math.max(0, budget - this.blipsSpawned))
      if (count > 0) {
        this.blipsSpawned += spawnBlips(board, entries, count).length
      }
    }
    convertRevealedBlips(board)

    // Stealer action phase (AI)
    runStealerActions(board)

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

  private setPhase(phase: PhaseName): void {
    this.phase = phase
    PieceEvents.emit('phaseChanged', { phase, turn: this.turnNumber })
  }
}
