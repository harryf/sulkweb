import type { Piece } from '../pieces/Piece.js';
import { Dir, toRelative } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';

export interface CombatResult {
  attackerRolls: number[];
  defenderRolls: number[];
  outcome: 'attacker' | 'defender' | 'draw';
}

/** Is `other` inside `piece`'s front 180°? Drives CC dice and the turn-to-face rule. */
export function isFacing(piece: Piece, other: Piece): boolean {
  const rel = toRelative(piece.facing, other.pos.c - piece.pos.c, other.pos.r - piece.pos.r);
  return rel.dr < 0 || (rel.dr === 0 && rel.dc !== 0);
}

function ccDice(piece: Piece, opponent: Piece): { count: number; bonus: number } {
  if (piece.kind === 'stealer') {
    return { count: isFacing(piece, opponent) ? 3 : 2, bonus: 0 };
  }
  return { count: 1, bonus: 0 }; // storm-bolter marine; sergeant bonus comes with that piece type
}

/**
 * Close combat, Sulk rules: each side rolls its dice, highest single die wins.
 * Tie: both survive. The loser dies — except a defender attacked from outside
 * its front arc, which turns to face the attacker instead of dying (first blow
 * from behind spins the piece rather than killing it). Costs the attacker 1 AP.
 * The attacker must be facing the square directly ahead of it.
 */
export function closeCombat(attacker: Piece, defender: Piece): CombatResult | undefined {
  if (attacker.ap < 1 || !attacker.alive || !defender.alive) return undefined;
  // Must attack the square directly in front
  const rel = toRelative(attacker.facing, defender.pos.c - attacker.pos.c, defender.pos.r - attacker.pos.r);
  if (!(rel.dc === 0 && rel.dr === -1)) return undefined;

  attacker.ap -= 1;
  const board = attacker.board;
  const a = ccDice(attacker, defender);
  const d = ccDice(defender, attacker);
  const attackerRolls = Array.from({ length: a.count }, () => board.dice.roll() + a.bonus);
  const defenderRolls = Array.from({ length: d.count }, () => board.dice.roll() + d.bonus);
  const aBest = Math.max(...attackerRolls);
  const dBest = Math.max(...defenderRolls);

  const defenderWasFacing = isFacing(defender, attacker);
  let outcome: CombatResult['outcome'];
  if (aBest > dBest) {
    outcome = 'attacker';
    if (defenderWasFacing) {
      defender.die();
    } else {
      // Blow from behind: the defender spins to face its attacker instead of dying
      faceToward(defender, attacker);
    }
  } else if (dBest > aBest) {
    outcome = 'defender';
    attacker.die();
  } else {
    outcome = 'draw';
    if (!defenderWasFacing) faceToward(defender, attacker);
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
