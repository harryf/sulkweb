import { Piece, type Coord, type PieceKind } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir } from '../core/Direction.js';
import { canShoot } from '../board/vision.js';
import { PieceEvents } from '../events/PieceEvents.js';

export class StormBolterMarine extends Piece {
  readonly kind: PieceKind = 'marine';

  /** texture name for Phaser render-layer */
  static readonly SPRITE_KEY = 'terminator_storm_bolter';
  static readonly RANGE = 12;

  jammed = false;
  overwatch = false;

  private sustainedTargetId: string | null = null;
  private sustainedBonus = 0;

  constructor(board: Board, start: Coord, facing: Dir = Dir.N) {
    super(board, start, facing);
  }

  /**
   * Fire the storm bolter: 1 AP, 2 dice, kill on any die ≥ 6.
   * Consecutive misses at the same target add +1 per miss (max +3);
   * the bonus is lost on move, turn, or target switch.
   */
  shoot(target: Piece): boolean {
    if (this.board.locked || this.jammed || this.ap < 1 || !target.alive) return false;
    const targetSquare = this.board.get(target.pos.c, target.pos.r);
    if (!targetSquare || !canShoot(this.board, this, targetSquare, StormBolterMarine.RANGE)) return false;

    this.ap -= 1;
    this.clearOverwatch();
    const bonus = this.sustainedTargetId === target.id ? this.sustainedBonus : 0;
    this.sustainedTargetId = target.id;
    return this.resolveBolterDice(target, bonus, false);
  }

  /** Overwatch reaction fire: free, no sustained bonus, jams on any double. */
  overwatchShot(target: Piece): boolean {
    if (!this.overwatch || this.jammed || !target.alive) return false;
    const targetSquare = this.board.get(target.pos.c, target.pos.r);
    if (!targetSquare || !canShoot(this.board, this, targetSquare, StormBolterMarine.RANGE)) return false;
    return this.resolveBolterDice(target, 0, true);
  }

  /** Enter overwatch for 2 AP. No other action until cancelled or lost. */
  overwatchOn(): boolean {
    if (this.jammed || this.overwatch || this.ap < 2) return false;
    this.ap -= 2;
    this.overwatch = true;
    PieceEvents.emit('overwatchChanged', { pieceId: this.id, on: true });
    return true;
  }

  /** Cancelling overwatch is free. */
  overwatchOff(): void {
    this.clearOverwatch();
  }

  /** Clear a jammed bolter for 1 AP. */
  unjam(): boolean {
    if (!this.jammed || this.ap < 1) return false;
    this.ap -= 1;
    this.jammed = false;
    return true;
  }

  protected override onActed(_action: 'move' | 'turn'): void {
    this.sustainedTargetId = null;
    this.sustainedBonus = 0;
    this.clearOverwatch();
  }

  private clearOverwatch(): void {
    if (!this.overwatch) return;
    this.overwatch = false;
    PieceEvents.emit('overwatchChanged', { pieceId: this.id, on: false });
  }

  private resolveBolterDice(target: Piece, bonus: number, canJam: boolean): boolean {
    const raw = [this.board.dice.roll(), this.board.dice.roll()];
    const rolls = raw.map(r => r + bonus);
    const hit = rolls.some(r => r >= 6);
    PieceEvents.emit('shot', {
      shooterId: this.id, targetId: target.id,
      x: target.pos.c, y: target.pos.r, rolls, hit
    });
    if (canJam && raw[0] === raw[1]) {
      this.jammed = true;
      this.clearOverwatch();
    }
    if (hit) {
      target.die();
      this.sustainedTargetId = null;
      this.sustainedBonus = 0;
    } else {
      this.sustainedBonus = Math.min(this.sustainedBonus + 1, 3);
    }
    return hit;
  }
}
