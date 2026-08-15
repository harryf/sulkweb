import { Piece, type Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir } from '../core/Direction.js';
import { canShoot } from '../board/vision.js';
import { PieceEvents } from '../events/PieceEvents.js';

export class StormBolterMarine extends Piece {

  /** texture name for Phaser render-layer */
  static readonly SPRITE_KEY: string = 'terminator_storm_bolter';
  /** Range limit applies ONLY to overwatch fire (original `_ow_weapon_range`);
   *  aimed shots are bounded by LOS alone. */
  static readonly OVERWATCH_RANGE = 12;

  jammed = false;
  overwatch = false;
  /** Move-and-shoot: the first shot after a move is free (original MNS). */
  freeShot = false;

  private sustainedTargetId: string | null = null;
  private sustainedBonus = 0;
  /** Sustained-fire cap per the original `_max_fire_bonus`. */
  private static readonly MAX_SUSTAINED = 4;

  constructor(board: Board, start: Coord, facing: Dir = Dir.N) {
    super('marine', board, start, facing);
  }

  /**
   * Fire the storm bolter: 1 AP (or FREE right after a move — move-and-shoot),
   * 2 dice, kill on any die ≥ 6. Consecutive aimed misses at the same target
   * add +1 per miss (max +4); the bonus is lost on move, turn, door use, or
   * target switch, and does not accrue on free or overwatch shots.
   */
  shoot(target: Piece): boolean {
    if (this.board.locked || this.jammed || !target.alive) return false;
    const free = this.freeShot;
    if (!free && this.ap < 1) return false;
    const targetSquare = this.board.get(target.pos.c, target.pos.r);
    if (!targetSquare || !canShoot(this.board, this, targetSquare)) return false;

    if (free) this.freeShot = false;
    else this.ap -= 1;
    this.clearOverwatch();
    const bonus = !free && this.sustainedTargetId === target.id ? this.sustainedBonus : 0;
    this.sustainedTargetId = target.id;
    return this.resolveBolterDice(target, bonus, false, !free);
  }

  /** Overwatch reaction fire: free, range-limited, no sustained bonus, jams on any double. */
  overwatchShot(target: Piece): boolean {
    if (!this.overwatch || this.jammed || !target.alive) return false;
    const targetSquare = this.board.get(target.pos.c, target.pos.r);
    if (!targetSquare || !canShoot(this.board, this, targetSquare, StormBolterMarine.OVERWATCH_RANGE)) return false;
    return this.resolveBolterDice(target, 0, true, false);
  }

  /** Enter overwatch for 2 AP. No other action until cancelled or lost. */
  overwatchOn(): boolean {
    if (this.jammed || this.overwatch || this.ap < 2) return false;
    this.ap -= 2;
    this.overwatch = true;
    this.freeShot = false;
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
    PieceEvents.emit('jammed', { pieceId: this.id, jammed: false });
    return true;
  }

  protected override onActed(action: 'move' | 'turn' | 'door'): void {
    this.sustainedTargetId = null;
    this.sustainedBonus = 0;
    this.clearOverwatch();
    // Move-and-shoot: a move earns one free shot; any other action forfeits it.
    this.freeShot = action === 'move';
  }

  override resetAP(): void {
    super.resetAP();
    this.freeShot = false;
    // Original refresh(): fire bonus and target memory do not survive the turn.
    this.sustainedTargetId = null;
    this.sustainedBonus = 0;
  }

  private clearOverwatch(): void {
    if (!this.overwatch) return;
    this.overwatch = false;
    PieceEvents.emit('overwatchChanged', { pieceId: this.id, on: false });
  }

  private resolveBolterDice(target: Piece, bonus: number, canJam: boolean, accrues: boolean): boolean {
    const raw = [this.board.dice.roll(), this.board.dice.roll()];
    const rolls = raw.map(r => r + bonus);
    const hit = rolls.some(r => r >= 6);
    PieceEvents.emit('shot', {
      shooterId: this.id, targetId: target.id,
      x: target.pos.c, y: target.pos.r, rolls, hit
    });
    if (canJam && raw[0] === raw[1]) {
      this.jammed = true;
      PieceEvents.emit('jammed', { pieceId: this.id, jammed: true });
      this.clearOverwatch();
    }
    if (hit) {
      target.die();
      this.sustainedTargetId = null;
      this.sustainedBonus = 0;
    } else if (accrues) {
      this.sustainedBonus = Math.min(this.sustainedBonus + 1, StormBolterMarine.MAX_SUSTAINED);
    }
    return hit;
  }
}

/** Sergeant: a storm-bolter terminator with +1 on every close-combat die and
 *  a +30s marine-phase timer bonus while alive (original `timer_bonus`). */
export class SergeantMarine extends StormBolterMarine {
  static override readonly SPRITE_KEY: string = 'terminator_sergeant';
  override readonly ccBonus = 1;
  override readonly timerBonus = 30;
}
