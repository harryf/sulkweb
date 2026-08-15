import { Piece, type Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir } from '../core/Direction.js';
import type { Square } from '../board/Square.js';
import { canShoot } from '../board/vision.js';
import { flameFlood, igniteSquares, sectionSquares } from '../rules/flame.js';
import { PieceEvents } from '../events/PieceEvents.js';

/**
 * Terminator with the heavy flamer. Original stats: 2 AP per shot, 6 ammo, no
 * reloads, range 12, no overwatch and no move-and-shoot. A shot targets a
 * SQUARE and sets its whole section ablaze. Self-destruct (1 AP, needs ammo)
 * silently kills everything in the marine's own section — including himself —
 * and flames every square of it.
 */
export class HeavyFlamerMarine extends Piece {

  static readonly SPRITE_KEY = 'terminator_heavy_flamer';
  static readonly RANGE = 12;
  static readonly SHOT_COST = 2;

  ammo = 6;

  constructor(board: Board, start: Coord, facing: Dir = Dir.N) {
    super('marine', board, start, facing);
  }

  /** Legality of flaming `target`: AP, ammo, fire arc + LOS + range, never the
   *  flamer's own section, and not a square carrying a closed door edge
   *  (translation of "flamers cannot shoot squares with closed doors on"). */
  canFlame(target: Square | undefined): target is Square {
    if (!target || this.board.locked || this.ammo < 1 || this.ap < HeavyFlamerMarine.SHOT_COST) return false;
    const own = this.board.get(this.pos.c, this.pos.r);
    if (own && own.sectionId === target.sectionId) return false;
    if (this.board.doorsAt({ c: target.x, r: target.y }).some(d => !d.isOpen)) return false;
    return canShoot(this.board, this, target, HeavyFlamerMarine.RANGE);
  }

  /** Flame a square: 2 AP, 1 ammo, floods its section. Returns killed piece ids. */
  flameAt(target: Square): string[] | undefined {
    if (!this.canFlame(target)) return undefined;
    this.ap -= HeavyFlamerMarine.SHOT_COST;
    this.ammo -= 1;
    PieceEvents.emit('ammoChanged', { pieceId: this.id, ammo: this.ammo });
    return igniteSquares(this.board, this.id, flameFlood(this.board, target));
  }

  /** Self-destruct: 1 AP, needs ammo. Kills every piece in the own section
   *  outright (no roll — original SILENT kills) and flames all its squares. */
  selfDestruct(): boolean {
    if (this.board.locked || this.ammo < 1 || this.ap < 1) return false;
    const own = this.board.get(this.pos.c, this.pos.r);
    if (!own) return false;
    this.ap -= 1;
    igniteSquares(this.board, this.id, sectionSquares(this.board, own), true);
    return true;
  }
}
