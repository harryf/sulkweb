import { Piece, type Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir, DIR_VEC } from '../core/Direction.js';
import { canShoot } from '../board/vision.js';
import { PieceEvents } from '../events/PieceEvents.js';
import { StormBolterMarine } from './StormBolterMarine.js';
import { Door } from '../rules/Door.js';

/**
 * Terminator with assault cannon (original Terminator_Marine_with_Assault_Cannon):
 * - aimed shot: 1 AP, THREE dice, kill on any ≥ 5; sustained fire LOWERS the
 *   requirement by 1 per consecutive aimed miss at the same target (max 4,
 *   floor 1); no bonus on move-and-shoot or overwatch
 * - 10 ammo, one RELOAD (4 AP) restores the drum
 * - AUTOFIRE: 2 AP + 5 ammo — every visible fire-arc unit (stealer-side
 *   pieces, closed doors, EVEN FELLOW MARINES) eats 3 dice vs 3, and the
 *   sweep repeats until a pass kills nothing
 * - MALFUNCTION: rolling a triple once more than 10 shots have been fired
 *   wrecks the gun — each adjacent piece dies on d6 ≥ 4 (marines ≥ 5, their
 *   armour counts) and the cannon marine is killed with it
 */
export class AssaultCannonMarine extends StormBolterMarine {
  static override readonly SPRITE_KEY: string = 'terminator_assault_cannon';
  static readonly KILL_REQ = 5;
  static readonly AUTO_KILL_REQ = 3;
  static readonly AUTOFIRE_COST = 2;
  static readonly AUTOFIRE_AMMO = 5;
  static readonly RELOAD_COST = 4;
  static readonly DRUM = 10;

  ammo = AssaultCannonMarine.DRUM;
  reloadsRemaining = 1;
  shotsFired = 0;

  constructor(board: Board, start: Coord, facing: Dir = Dir.N) {
    super(board, start, facing);
  }

  /** Aimed / move-and-shoot cannon fire — replaces the bolter dice entirely. */
  override shoot(target: Piece): boolean {
    if (this.board.locked || this.jammed || !target.alive || this.ammo < 1) return false;
    const free = this.freeShot;
    if (!free && this.ap < 1) return false;
    const targetSquare = this.board.get(target.pos.c, target.pos.r);
    if (!targetSquare || !canShoot(this.board, this, targetSquare)) return false;

    if (free) this.freeShot = false;
    else this.ap -= 1;
    this.clearOverwatch();
    const bonus = !free && this.sustainedTargetId === target.id ? this.sustainedBonus : 0;
    this.sustainedTargetId = target.id;
    return this.resolveCannonDice(target, bonus, !free);
  }

  /** Overwatch: cannon dice, range-limited, no sustained bonus, no jam —
   *  the cannon's failure mode is the malfunction, not the jam. */
  override overwatchShot(target: Piece): boolean {
    if (!this.overwatch || !target.alive || this.ammo < 1) return false;
    const targetSquare = this.board.get(target.pos.c, target.pos.r);
    if (!targetSquare || !canShoot(this.board, this, targetSquare, StormBolterMarine.OVERWATCH_RANGE)) return false;
    return this.resolveCannonDice(target, 0, false);
  }

  canAutofire(): boolean {
    return !this.board.locked && !this.jammed &&
      this.ammo >= AssaultCannonMarine.AUTOFIRE_AMMO && this.ap >= AssaultCannonMarine.AUTOFIRE_COST;
  }

  /**
   * Full auto: shred everything in the fire arc with LOS — repeated passes,
   * because each kill can open sight to the next rank (original loops until
   * `something_killed` stays false). Doors judged by their anchor square.
   */
  autofire(): boolean {
    if (!this.canAutofire()) return false;
    this.ap -= AssaultCannonMarine.AUTOFIRE_COST;
    this.ammo -= AssaultCannonMarine.AUTOFIRE_AMMO;
    this.shotsFired += AssaultCannonMarine.AUTOFIRE_AMMO;
    this.clearOverwatch();
    PieceEvents.emit('ammoChanged', { pieceId: this.id, ammo: this.ammo });

    for (;;) {
      let somethingKilled = false;
      // Pieces (any side but self) in arc + LOS
      for (const p of [...this.board.pieces] as Piece[]) {
        if (p === this || !p.alive) continue;
        const sq = this.board.get(p.pos.c, p.pos.r);
        if (!sq || !canShoot(this.board, this, sq)) continue;
        const rolls = [this.board.dice.roll(), this.board.dice.roll(), this.board.dice.roll()];
        const hit = Math.max(...rolls) >= AssaultCannonMarine.AUTO_KILL_REQ;
        PieceEvents.emit('shot', { shooterId: this.id, targetId: p.id, x: p.pos.c, y: p.pos.r, rolls, hit });
        if (hit) { p.die(); somethingKilled = true; }
      }
      // Closed doors in arc + LOS. doorInSight tests BOTH flanking squares —
      // the anchor alone misses doors whose anchor sits behind the edge.
      for (const door of this.board.allDoors()) {
        if (door.isOpen || door.destroyed) continue;
        if (!this.doorInSight(door)) continue;
        const rolls = [this.board.dice.roll(), this.board.dice.roll(), this.board.dice.roll()];
        if (Math.max(...rolls) >= AssaultCannonMarine.AUTO_KILL_REQ) {
          door.destroy();
          PieceEvents.emit('doorDestroyed', { x: door.square.x, y: door.square.y, facing: door.facing });
          somethingKilled = true;
        }
      }
      if (!somethingKilled) break;
    }
    this.maybeMalfunction([this.board.dice.roll(), this.board.dice.roll(), this.board.dice.roll()]);
    return true;
  }

  /** Cannon door shots also need a round in the drum. */
  override canShootDoor(door: Door | undefined): door is Door {
    return this.ammo >= 1 && super.canShootDoor(door);
  }

  /**
   * Aimed cannon fire at a closed door (original aburst_kill_scorereq=5):
   * 3 dice, destroyed on any ≥ 5 (sustained lowers the requirement), 1 ammo,
   * and the shot counts toward the malfunction clock like any other.
   */
  override shootDoor(door: Door): boolean {
    if (!this.canShootDoor(door)) return false;
    const free = this.freeShot;
    if (free) this.freeShot = false;
    else this.ap -= 1;
    this.clearOverwatch();
    const key = StormBolterMarine.doorKey(door);
    const bonus = !free && this.sustainedTargetId === key ? this.sustainedBonus : 0;
    this.sustainedTargetId = key;
    this.ammo -= 1;
    PieceEvents.emit('ammoChanged', { pieceId: this.id, ammo: this.ammo });
    const rolls = [this.board.dice.roll(), this.board.dice.roll(), this.board.dice.roll()];
    const req = Math.max(1, AssaultCannonMarine.KILL_REQ - bonus);
    const hit = rolls.some(r => r >= req);
    PieceEvents.emit('shot', { shooterId: this.id, targetId: key, x: door.square.x, y: door.square.y, rolls, hit });
    if (hit) {
      door.destroy();
      PieceEvents.emit('doorDestroyed', { x: door.square.x, y: door.square.y, facing: door.facing });
      this.sustainedTargetId = null;
      this.sustainedBonus = 0;
    } else if (!free) {
      this.sustainedBonus = Math.min(bonus + 1, StormBolterMarine.MAX_SUSTAINED);
    }
    this.shotsFired += 1;
    this.maybeMalfunction(rolls);
    return hit;
  }

  canReload(): boolean {
    return this.reloadsRemaining > 0 && this.ap >= AssaultCannonMarine.RELOAD_COST && !this.board.locked;
  }

  /** Swap in the spare drum (original ReloadsMixIn: 4 AP, once). */
  reload(): boolean {
    if (!this.canReload()) return false;
    this.ap -= AssaultCannonMarine.RELOAD_COST;
    this.reloadsRemaining -= 1;
    this.ammo = AssaultCannonMarine.DRUM;
    PieceEvents.emit('ammoChanged', { pieceId: this.id, ammo: this.ammo });
    return true;
  }

  /** Fake-ambush reflex fire: the cannon burns a round and can blow itself up. */
  override fireAtNothing(): void {
    if (this.ammo < 1) return;
    this.ammo -= 1;
    PieceEvents.emit('ammoChanged', { pieceId: this.id, ammo: this.ammo });
    const rolls = [this.board.dice.roll(), this.board.dice.roll(), this.board.dice.roll()];
    PieceEvents.emit('shot', { shooterId: this.id, targetId: '', x: this.pos.c, y: this.pos.r, rolls, hit: false });
    this.shotsFired += 1;
    this.maybeMalfunction(rolls);
  }

  private resolveCannonDice(target: Piece, bonus: number, accrues: boolean): boolean {
    this.ammo -= 1;
    PieceEvents.emit('ammoChanged', { pieceId: this.id, ammo: this.ammo });
    const rolls = [this.board.dice.roll(), this.board.dice.roll(), this.board.dice.roll()];
    const req = Math.max(1, AssaultCannonMarine.KILL_REQ - bonus);
    const hit = rolls.some(r => r >= req);
    PieceEvents.emit('shot', { shooterId: this.id, targetId: target.id, x: target.pos.c, y: target.pos.r, rolls, hit });
    if (hit) {
      target.die();
      this.sustainedTargetId = null;
      this.sustainedBonus = 0;
    } else if (accrues) {
      this.sustainedBonus = Math.min(this.sustainedBonus + 1, StormBolterMarine.MAX_SUSTAINED);
    }
    this.shotsFired += 1;
    this.maybeMalfunction(rolls);
    return hit;
  }

  /** Triples past ten shots wreck the gun (original malfunction()). */
  private maybeMalfunction(rolls: number[]): void {
    if (!this.alive) return;
    if (rolls.length < 3 || !(rolls[0] === rolls[1] && rolls[1] === rolls[2])) return;
    if (this.shotsFired <= 10) return;
    const kills: string[] = [];
    const origin = this.board.get(this.pos.c, this.pos.r);
    if (origin) {
      for (const adj of this.board.adjacentsOf(origin)) {
        const p = this.board.pieceAt({ c: adj.x, r: adj.y }) as Piece | undefined;
        if (!p?.alive) continue;
        const req = p.kind === 'marine' ? 5 : 4;
        if (this.board.dice.roll() >= req) {
          kills.push(p.id);
          p.die();
        }
      }
    }
    kills.push(this.id);
    PieceEvents.emit('malfunction', { pieceId: this.id, x: this.pos.c, y: this.pos.r, kills });
    this.die();
  }
}

/** Terminator with chain fist: a storm-bolter marine whose powered blade CUTS
 *  a door apart — 1 AP, front edge only, the door is gone for good. */
export class ChainFistMarine extends StormBolterMarine {
  static override readonly SPRITE_KEY: string = 'terminator_chain_fist';
  static readonly CUT_COST = 1;

  canCutDoor(): Door | undefined {
    if (this.board.locked || this.ap < ChainFistMarine.CUT_COST) return undefined;
    const v = DIR_VEC[this.facing];
    const ahead = { c: this.pos.c + v.dc, r: this.pos.r + v.dr };
    const door = this.board.doorBetween(this.pos, ahead);
    return door && !door.destroyed ? door : undefined;
  }

  cutDoor(): boolean {
    const door = this.canCutDoor();
    if (!door) return false;
    this.ap -= ChainFistMarine.CUT_COST;
    door.destroy();
    PieceEvents.emit('doorDestroyed', { x: door.square.x, y: door.square.y, facing: door.facing });
    this.onActed('door');
    return true;
  }
}
