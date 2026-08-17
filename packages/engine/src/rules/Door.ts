import { Feature } from './Feature.js';
import type { Square } from '../board/Square.js';
import { Dir, DIR_VEC, FACING_WORD } from '../core/Direction.js';
import { PieceEvents } from '../events/PieceEvents.js';

/**
 * EDGE-MODEL door: the door lives on the BOUNDARY between its anchor square
 * and the neighbor in `facing` — it does not occupy a square. Movement checks
 * the edge in `Piece.tryMove`, sight checks it in `board/los.ts`, the AI opens
 * it on contact in `StealerAI`. The Feature registration on the anchor square
 * exists only so `Board.doorsAt()` can find it.
 */
export class Door extends Feature {
  private closed = true
  /** Cut apart by a chain fist or shredded by assault-cannon autofire —
   *  a destroyed door is permanently open and can no longer be operated. */
  destroyed = false
  /** Which neighbor of the anchor square the door edge borders. */
  readonly facing: Dir

  constructor(square: Square, facing: Dir = Dir.N) { super(square); this.facing = facing }

  get isOpen(): boolean { return this.destroyed || !this.closed }

  /** Remove the door from play (original door.kill()). */
  destroy(): void { this.destroyed = true; this.closed = false }

  /** The square on the far side of the edge from the anchor. */
  otherSide(): { c: number; r: number } {
    const v = DIR_VEC[this.facing]
    return { c: this.square.x + v.dc, r: this.square.y + v.dr }
  }

  open(): void  { this.closed = false }
  close(): void { if (!this.destroyed) this.closed = true }

  toggle(): void { if (!this.destroyed) this.closed = !this.closed }

  // The edge blocks; the anchor square itself never does.
  blocksMove() { return false }
  blocksLOS()  { return false }
}

/** Mission-JSON door-facing words map exactly like piece facings. */
export const DOOR_FACING = FACING_WORD;

/**
 * Destroy a door AND announce it — the one sanctioned emit for door
 * destruction (chain fist, bolter door shot, cannon fire). The Door class
 * itself stays silent so probes (e.g. the blip open-peek-close check in
 * StealerAI) never leak events.
 */
export function demolishDoor(door: Door): void {
  door.destroy();
  PieceEvents.emit('doorDestroyed', { x: door.square.x, y: door.square.y, facing: door.facing });
}

/** Open a door AND announce it, spending 1 AP from `piece` (AI door-on-contact path). */
export function openDoorWithEvent(door: Door, piece: { ap: number }): void {
  door.open();
  piece.ap -= 1;
  PieceEvents.emit('doorToggled', { x: door.square.x, y: door.square.y, facing: door.facing, open: true });
}

/** Close a door AND announce it, spending 1 AP from `piece` (hive staging goes
 *  dark behind it — massing stealers shut the doors marines opened). */
export function closeDoorWithEvent(door: Door, piece: { ap: number }): void {
  door.close();
  piece.ap -= 1;
  PieceEvents.emit('doorToggled', { x: door.square.x, y: door.square.y, facing: door.facing, open: false });
}
