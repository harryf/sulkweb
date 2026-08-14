import { Piece } from './pieces/Piece.js';
import { StormBolterMarine } from './pieces/StormBolterMarine.js';
import { Board } from './board/Board.js'
import type { CompiledMission } from './missions/missionTypes.js'
import { Dir } from './core/Direction.js';
import { runStealerActions, spawnBlips, convertRevealedBlips } from './ai/StealerAI.js';
import { PieceEvents } from './events/PieceEvents.js';

export type GameResult = 'ongoing' | 'win' | 'loss';
export type PhaseName = 'MarineAction' | 'StealerAction';

export interface EngineState {
  board: Board;
  pieces: Piece[];
  result: GameResult;
}

const FACING: Record<string, Dir> = { up: Dir.N, right: Dir.E, down: Dir.S, left: Dir.W };

/** Marine-phase clock, per the Sulk manual: 2 minutes (+30s per sergeant, later). */
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

  constructor(mission: CompiledMission, extraPieces: Piece[] = []) {
    this.mission = mission
    const board = new Board(mission.width, mission.height, mission.squares)
    this.state = { board, pieces: board.pieces as Piece[], result: 'ongoing' }
    for (const p of extraPieces) board.addPiece(p)

    // Deploy the marine squad
    for (const d of mission.marineDeployment ?? []) {
      new StormBolterMarine(board, { c: d.x, r: d.y }, FACING[d.facing ?? 'down'])
    }
    // Seed the first blips
    const entries = (mission.entryPoints ?? []).map(e => ({ c: e.x, r: e.y }))
    if (entries.length && (mission.initialBlips ?? 0) > 0) {
      spawnBlips(board, entries, mission.initialBlips!)
    }
    this.rollCommandPoints()
  }

  findPiece(id: string): Piece | undefined {
    return this.state.pieces.find(p => p.id === id)
  }

  get marines(): StormBolterMarine[] {
    return this.state.pieces.filter((p): p is StormBolterMarine => p.kind === 'marine')
  }

  get stealerSide(): Piece[] {
    return this.state.pieces.filter(p => p.kind !== 'marine')
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
   * turn synchronously: reinforcements → stealer actions → end phase → new turn.
   */
  endMarinePhase(): void {
    if (this.state.result !== 'ongoing' || this.phase !== 'MarineAction') return

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

    // End phase: victory checks, effect cleanup, AP refresh
    this.checkVictory()
    if (this.state.result !== 'ongoing') return

    this.turnNumber += 1
    for (const p of this.state.pieces) {
      p.resetAP()
      PieceEvents.emit('apChanged', { pieceId: p.id, apRemaining: p.apRemaining, apInitial: p.apInitial })
    }
    this.rollCommandPoints()
    this.setPhase('MarineAction')
  }

  /** Evaluate the mission objective. Also fired when pieces die mid-phase. */
  checkVictory(): void {
    if (this.state.result !== 'ongoing') return
    const objective = this.mission.objective ?? 'exterminate'
    const marinesAlive = this.marines.length > 0
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
