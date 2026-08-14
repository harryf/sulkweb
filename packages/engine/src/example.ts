// Quick engine smoke tour: board, doors, movement, vision, phase cycle.
// Run with: pnpm --filter ./packages/engine example
import { Board } from './board/Board.js';
import { Door } from './rules/Door.js';
import { StormBolterMarine } from './pieces/StormBolterMarine.js';
import { Dir } from './core/Direction.js';
import { canSee, visibleSquares } from './board/vision.js';
import { GameCycle } from './GameCycle.js';
import { loadMission } from './missions/missionLoader.js';

const board = new Board(5, 5);
const marine = new StormBolterMarine(board, { c: 2, r: 3 }, Dir.N);
console.log(`Marine at (${marine.pos.c},${marine.pos.r}) facing N, AP ${marine.ap}/${marine.apInitial}`);

const doorSquare = board.get(2, 2)!;
doorSquare.features.add(new Door(doorSquare, Dir.N));
console.log(`Closed door ahead — forward move allowed? ${marine.moveForward()}`);
console.log(`Sees beyond the door? ${canSee(board, marine, board.get(2, 0)!)}`);

console.log(`Use door: ${marine.useDoor()} (AP now ${marine.ap})`);
console.log(`Forward through open door: ${marine.moveForward()} → (${marine.pos.c},${marine.pos.r}), AP ${marine.ap}`);
console.log(`Visible squares: ${visibleSquares(board, marine).length}`);

const cycle = new GameCycle();
console.log(`\nPhase chain from turn ${cycle.turnNumber}:`);
for (let i = 0; i < 5; i++) {
  console.log(`  ${cycle.phase.name}`);
  cycle.step();
}

const mission = loadMission('space_hulk_1');
console.log(`\nLoaded mission "${mission.name}" (${mission.width}×${mission.height}, ${mission.squares.length} squares)`);
const missionBoard = new Board(mission.width, mission.height, mission.squares);
const doors = missionBoard.allSquares().filter(sq => missionBoard.doorAt({ c: sq.x, r: sq.y }));
console.log(`Doors on board: ${doors.length}`);
