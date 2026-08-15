import type { Piece } from '../pieces/Piece.js';
import { Dir, toRelative, DIR_VEC } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';

export interface CombatResult {
  attackerRolls: number[];
  defenderRolls: number[];
  outcome: 'attacker' | 'defender' | 'draw';
}

/** Is `other` inside `piece`'s front 180°? Drives CC dice counts. */
export function isFacing(piece: Piece, other: Piece): boolean {
  const rel = toRelative(piece.facing, other.pos.c - piece.pos.c, other.pos.r - piece.pos.r);
  return rel.dr < 0 || (rel.dr === 0 && rel.dc !== 0);
}

/** Is `other` on the square DIRECTLY ahead of `piece`? (the only square a piece can strike) */
function directlyAhead(piece: Piece, other: Piece): boolean {
  const v = DIR_VEC[piece.facing];
  return piece.pos.c + v.dc === other.pos.c && piece.pos.r + v.dr === other.pos.r;
}

function ccDice(piece: Piece, opponent: Piece): { count: number; bonus: number } {
  if (piece.kind === 'stealer') {
    return { count: isFacing(piece, opponent) ? 3 : 2, bonus: piece.ccBonus };
  }
  return { count: 1, bonus: piece.ccBonus }; // marines: 1 die, sergeant adds +1
}

/**
 * Close combat per the original Sulk resolution (`Piece.cc`):
 * - attacker wins  → the defender dies, facing irrelevant;
 * - defender wins  → the attacker dies ONLY if the defender could strike back
 *   (attacker directly ahead of it); otherwise the attacker survives and the
 *   defender spins to face it;
 * - draw           → both survive, the defender spins to face the attacker.
 * Costs the attacker 1 AP; the attacker must face its target directly.
 */
export function closeCombat(attacker: Piece, defender: Piece): CombatResult | undefined {
  if (attacker.ap < 1 || !attacker.alive || !defender.alive) return undefined;
  if (!directlyAhead(attacker, defender)) return undefined;

  attacker.ap -= 1;
  const board = attacker.board;
  const a = ccDice(attacker, defender);
  const d = ccDice(defender, attacker);
  const attackerRolls = Array.from({ length: a.count }, () => board.dice.roll() + a.bonus);
  const defenderRolls = Array.from({ length: d.count }, () => board.dice.roll() + d.bonus);
  const aBest = Math.max(...attackerRolls);
  const dBest = Math.max(...defenderRolls);

  let outcome: CombatResult['outcome'];
  if (aBest > dBest) {
    outcome = 'attacker';
    defender.die();
  } else if (dBest > aBest) {
    outcome = 'defender';
    if (directlyAhead(defender, attacker)) {
      attacker.die();
    } else {
      faceToward(defender, attacker); // won but couldn't strike — turn to face
    }
  } else {
    outcome = 'draw';
    faceToward(defender, attacker);
  }

  PieceEvents.emit('closeCombat', {
    attackerId: attacker.id, defenderId: defender.id,
    attackerRolls, defenderRolls, outcome
  });
  return { attackerRolls, defenderRolls, outcome };
}

function faceToward(piece: Piece, other: Piece): void {
  const dc = other.pos.c - piece.pos.c;
  const dr = other.pos.r - piece.pos.r;
  if (Math.abs(dc) >= Math.abs(dr)) {
    piece.facing = dc > 0 ? Dir.E : Dir.W;
  } else {
    piece.facing = dr > 0 ? Dir.S : Dir.N;
  }
}
