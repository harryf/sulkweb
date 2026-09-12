/**
 * Player commands (2.x real time). The client never calls a piece's action
 * methods; every player action is a MarineCommand handed to
 * `GameEngine.command(marineId, command)`, which applies it at once between
 * ticks, stamps the marine's direct-control lease, and emits a `command`
 * event that the game log records against the tick it followed. A seed plus
 * the ordered command log therefore replays a game headlessly.
 *
 * Pure data with no imports so the events module can name the type.
 */
export type MoveDir = 'forward' | 'backward' | 'forwardLeft' | 'forwardRight' | 'backLeft' | 'backRight';

export type MarineCommand =
  | { type: 'move'; dir: MoveDir }
  | { type: 'turn'; delta: -1 | 1 | 2 }
  | { type: 'door' }
  | { type: 'shoot'; targetId: string }
  | { type: 'shootDoor'; x: number; y: number; facing: number }
  | { type: 'flame'; x: number; y: number }
  | { type: 'melee' }
  | { type: 'overwatch'; on: boolean }
  | { type: 'unjam' }
  | { type: 'selfDestruct' }
  | { type: 'autofire' }
  | { type: 'reload' }
  | { type: 'cutDoor' }
  | { type: 'cp' };
