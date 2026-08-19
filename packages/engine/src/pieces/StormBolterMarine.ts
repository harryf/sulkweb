import { Piece, type Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir, DIR_VEC } from '../core/Direction.js';
import { canShoot } from '../board/vision.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { demolishDoor, type Door } from '../rules/Door.js';

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

  protected sustainedTargetId: string | null = null;
  protected sustainedBonus = 0;
  /** Sustained-fire cap per the original `_max_fire_bonus`. */
  protected static readonly MAX_SUSTAINED = 4;

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
    const s = this.beginAimedShot(target);
    if (!s) return false;
    return this.resolveBolterDice(target, s.bonus, false, !s.free);
  }

  /**
   * Legality of an aimed shot at a piece — the read-only mirror of
   * beginAimedShot's guards, shaped like canShootDoor. The client's
   * auto-target and fire reticle filter through this so the indicator
   * never marks a target shoot() would refuse (e.g. an empty cannon drum).
   */
  canShootPiece(target: Piece): boolean {
    if (this.board.locked || this.jammed || !target.alive) return false;
    if (!this.freeShot && this.ap < 1) return false;
    const sq = this.board.get(target.pos.c, target.pos.r);
    return sq !== undefined && canShoot(this.board, this, sq);
  }

  /**
   * Shared aimed-shot preamble (bolter and cannon): legality guards, then the
   * spend — free-shot consumption or 1 AP, overwatch drop, sustained-bonus
   * lookup keyed on the target. Returns undefined when the shot is illegal
   * (nothing is spent), else what the dice resolution needs.
   */
  protected beginAimedShot(target: Piece): { free: boolean; bonus: number } | undefined {
    if (this.board.locked || this.jammed || !target.alive) return undefined;
    const free = this.freeShot;
    if (!free && this.ap < 1) return undefined;
    const targetSquare = this.board.get(target.pos.c, target.pos.r);
    if (!targetSquare || !canShoot(this.board, this, targetSquare)) return undefined;

    if (free) this.freeShot = false;
    else this.ap -= 1;
    this.clearOverwatch();
    const bonus = !free && this.sustainedTargetId === target.id ? this.sustainedBonus : 0;
    this.sustainedTargetId = target.id;
    return { free, bonus };
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
    if (this.board.locked || this.jammed || this.overwatch || this.ap < 2) return false;
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

  /** Stable identity for sustained-fire tracking of door targets — doors have
   *  no piece id, so the edge coordinates stand in. */
  protected static doorKey(door: Door): string {
    return `door:${door.square.x},${door.square.y},${door.facing}`;
  }

  /**
   * The closed door's edge is shootable: in the fire arc with clear LOS.
   * EDGE-MODEL subtlety: a closed door blocks any sight line crossing its own
   * segment — including the line to its far flanking square — so test BOTH
   * flanking squares; and a marine standing at the edge (which is never in
   * his own fire arc) can always shoot the door directly ahead point-blank.
   */
  protected doorInSight(door: Door): boolean {
    const v = DIR_VEC[this.facing];
    if (this.board.doorBetween(this.pos, { c: this.pos.c + v.dc, r: this.pos.r + v.dr }) === door) return true;
    const other = door.otherSide();
    return [this.board.get(door.square.x, door.square.y), this.board.get(other.c, other.r)]
      .some(sq => sq !== undefined && canShoot(this.board, this, sq));
  }

  /** Legality of an aimed shot at a door: closed, affordable, edge in sight. */
  canShootDoor(door: Door | undefined): door is Door {
    if (!door || door.destroyed || door.isOpen) return false;
    if (this.board.locked || this.jammed) return false;
    if (!this.freeShot && this.ap < 1) return false;
    return this.doorInSight(door);
  }

  /**
   * Aimed fire at a closed door (original: features carry sh_kill_scorereq=6):
   * 1 AP (or the move-and-shoot free shot), 2 dice, destroyed on any die ≥ 6.
   * Misses at the same door accrue the sustained-fire bonus like any target.
   */
  shootDoor(door: Door): boolean {
    if (!this.canShootDoor(door)) return false;
    const { free, key, bonus } = this.beginDoorShot(door);
    const rolls = [this.board.dice.roll(), this.board.dice.roll()].map(r => r + bonus);
    const hit = rolls.some(r => r >= 6);
    PieceEvents.emit('shot', { shooterId: this.id, targetId: key, x: door.square.x, y: door.square.y, rolls, hit });
    this.settleDoorShot(door, hit, free, bonus);
    return hit;
  }

  /** Shared door-shot preamble: spend (free shot or 1 AP), overwatch drop,
   *  sustained-bonus lookup keyed on the door edge. */
  protected beginDoorShot(door: Door): { free: boolean; key: string; bonus: number } {
    const free = this.freeShot;
    if (free) this.freeShot = false;
    else this.ap -= 1;
    this.clearOverwatch();
    const key = StormBolterMarine.doorKey(door);
    const bonus = !free && this.sustainedTargetId === key ? this.sustainedBonus : 0;
    this.sustainedTargetId = key;
    return { free, key, bonus };
  }

  /** Shared door-shot epilogue: demolish on hit, else accrue sustained fire. */
  protected settleDoorShot(door: Door, hit: boolean, free: boolean, bonus: number): void {
    if (hit) {
      demolishDoor(door);
      this.clearSustained();
    } else if (!free) {
      this.sustainedBonus = Math.min(bonus + 1, StormBolterMarine.MAX_SUSTAINED);
    }
  }

  /** A fake ambush counter revealed itself: every overwatcher who saw it
   *  reflex-fires at empty space (original fire_at_empty_space) — the bolter
   *  rolls its dice and can JAM on a double; nothing is consumed otherwise. */
  fireAtNothing(): void {
    const raw = [this.board.dice.roll(), this.board.dice.roll()];
    PieceEvents.emit('shot', { shooterId: this.id, targetId: '', x: this.pos.c, y: this.pos.r, rolls: raw, hit: false });
    if (raw[0] === raw[1]) this.jam();
  }

  /** Clear a jammed bolter for 1 AP. */
  unjam(): boolean {
    if (this.board.locked || !this.jammed || this.ap < 1) return false;
    this.ap -= 1;
    this.jammed = false;
    PieceEvents.emit('jammed', { pieceId: this.id, jammed: false });
    return true;
  }

  protected override onActed(action: 'move' | 'turn' | 'door'): void {
    this.clearSustained();
    this.clearOverwatch();
    // Move-and-shoot: a move earns one free shot; any other action forfeits it.
    this.freeShot = action === 'move';
  }

  override resetAP(): void {
    super.resetAP();
    this.freeShot = false;
    // Original refresh(): fire bonus and target memory do not survive the turn.
    this.clearSustained();
  }

  protected clearOverwatch(): void {
    if (!this.overwatch) return;
    this.overwatch = false;
    PieceEvents.emit('overwatchChanged', { pieceId: this.id, on: false });
  }

  /** Forget the sustained-fire target and bonus. */
  protected clearSustained(): void {
    this.sustainedTargetId = null;
    this.sustainedBonus = 0;
  }

  /** The bolter fouls: announce it and drop overwatch. */
  protected jam(): void {
    this.jammed = true;
    PieceEvents.emit('jammed', { pieceId: this.id, jammed: true });
    this.clearOverwatch();
  }

  private resolveBolterDice(target: Piece, bonus: number, canJam: boolean, accrues: boolean): boolean {
    const raw = [this.board.dice.roll(), this.board.dice.roll()];
    const rolls = raw.map(r => r + bonus);
    const hit = rolls.some(r => r >= 6);
    PieceEvents.emit('shot', {
      shooterId: this.id, targetId: target.id,
      x: target.pos.c, y: target.pos.r, rolls, hit
    });
    if (canJam && raw[0] === raw[1]) this.jam();
    if (hit) {
      target.die();
      this.clearSustained();
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

/** Sergeant with power sword (beta_2): everything the sergeant has, plus the
 *  PARRY — force one reroll of the opponent's best CC die when losing/tied. */
export class SwordSergeantMarine extends SergeantMarine {
  static override readonly SPRITE_KEY: string = 'terminator_sergeant_sword';
  override readonly parry: boolean = true;
}
