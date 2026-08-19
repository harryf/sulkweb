import { Piece, type Coord } from './Piece.js';
import { Board } from '../board/Board.js';
import { Dir, turn, chebyshev } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';

/**
 * Genestealer: 6 AP, fast mover, free 90° turns, deadly in close combat
 * (3 dice from the front, 2 from side/rear). Cannot shoot.
 * Free-turn limit per the original: the SAME 90° direction twice in a row
 * costs 1 AP the second time (`just_turned`); any other action resets it.
 */
export class Genestealer extends Piece {

  static readonly SPRITE_KEY = 'stealer';
  static readonly AP = 6;

  /** A stealer this close (Chebyshev) to a living marine charges: the hive's
   *  PHASE-END sweep (StealerAI.chargeOrientation) spins it to face its
   *  nearest prey after all activations. Beyond this radius facing stays on
   *  the path, so distant flank/stage routing is untouched; inside it, a
   *  stealer routed away from its prey may pay a 1 AP about-face next
   *  activation that the path planner does not price. Combat consequence
   *  (deliberate, optimal-play-faithful): a charge-faced stealer defends
   *  marine melee with 3 dice AND strikes back lethally on a defender win —
   *  exactly what a human stealer player's free end-of-activation turn
   *  would set up. */
  static readonly CHARGE_DIST = 6;

  /** Direction of the last free 90° turn (-1 left / 1 right), if unbroken by another action. */
  private lastFreeTurn: -1 | 1 | null = null;

  constructor(board: Board, start: Coord, facing: Dir = Dir.S) {
    super('stealer', board, start, facing, Genestealer.AP);
  }

  protected override moveCost(rel: { dc: number; dr: number }): number | undefined {
    const key = `${rel.dc},${rel.dr}`;
    const COSTS: Record<string, number> = {
      '0,-1': 1, '1,-1': 1, '-1,-1': 1,  // forward & forward diagonals
      '1,0': 1, '-1,0': 1,               // side-steps
      '0,1': 2, '1,1': 2, '-1,1': 2,     // backward & backward diagonals
    };
    return COSTS[key];
  }

  override tryTurn(delta: -1 | 1 | 2): boolean {
    if (this.board.locked) return false;
    const repeat = delta !== 2 && this.lastFreeTurn === delta;
    const cost = delta === 2 ? 1 : repeat ? 1 : 0;
    if (cost > this.ap) return false;
    this.facing = turn(this.facing, delta);
    this.ap -= cost;
    this.lastFreeTurn = delta !== 2 && cost === 0 ? delta : null;
    PieceEvents.emit('pieceMoved', { pieceId: this.id, x: this.pos.c, y: this.pos.r, facing: this.facing });
    return true;
  }

  protected override onActed(_action: 'move' | 'turn' | 'door'): void {
    this.lastFreeTurn = null; // a move/door between turns re-earns the free turn
  }

  /** The living marine this stealer would charge — nearest by Chebyshev
   *  within CHARGE_DIST, deterministic tie by board order — or null. Used by
   *  the hive's phase-end orientation sweep (StealerAI.chargeOrientation). */
  chargeTarget(): Piece | null {
    let nearest: Piece | null = null;
    let best = Genestealer.CHARGE_DIST + 1;
    for (const p of this.board.pieces) {
      const piece = p as Piece;
      if (piece.kind !== 'marine' || !piece.alive) continue;
      const d = chebyshev(this.pos, piece.pos);
      if (d < best) { best = d; nearest = piece; }
    }
    return nearest;
  }

  override resetAP(): void {
    super.resetAP();
    this.lastFreeTurn = null;
  }

  protected override turnCost(key: 'LEFT' | 'RIGHT' | 'ABOUT'): number {
    return key === 'ABOUT' ? 1 : 0;
  }
}
