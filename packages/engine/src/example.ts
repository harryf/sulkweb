import { Board } from './board/Board.js';
import { Piece } from './rules/Piece.js';
import { Door } from './rules/Door.js';
import { hasLineOfSight } from './board/los.js';
import { GameCycle } from './GameCycle.js';
import { loadMissionSync } from './missions/missionLoader.js';
import { GameEngine } from './GameEngine.js';

// 1. Create a board
const board = new Board(5, 5, []);
console.log('Created a 5x5 board.');

// 2. Create a piece and define target squares
const startSquare = board.getSquare(2, 2)!;
const moveTargetSquare = board.getSquare(2, 1)!; // One square north for movement
const losTargetSquare = board.getSquare(2, 0)!;  // Two squares north for LOS check

const piece = new Piece(board, startSquare, 0); // Facing North
console.log(`Piece created at (${startSquare.coord.join(',')}), facing North.`);
console.log(`Initial AP: ${piece.apRemaining}`);

// 3. Add a closed door on the movement target square
const door = new Door(moveTargetSquare, 0);
moveTargetSquare.features.add(door);
console.log(`\nAdded a closed door at (${moveTargetSquare.coord.join(',')}).`);

// 4. Check movement and LOS with the closed door
console.log('--- With Closed Door ---');
let moveCost = piece.canMove(moveTargetSquare);
console.log(`Can move to (${moveTargetSquare.coord.join(',')})? Cost: ${moveCost}`);
if (moveCost === undefined) {
  console.log('Move blocked, as expected.');
}

let losExists = hasLineOfSight(board, piece.square, losTargetSquare);
console.log(`Has LOS to (${losTargetSquare.coord.join(',')})? ${losExists}`);
if (!losExists) {
    console.log('LOS blocked, as expected.');
}


// 5. Open the door
door.open();
console.log('\n--- Opened the Door ---');

// 6. Check movement and LOS again
moveCost = piece.canMove(moveTargetSquare);
console.log(`Can move to (${moveTargetSquare.coord.join(',')})? Cost: ${moveCost}`);

losExists = hasLineOfSight(board, piece.square, losTargetSquare);
console.log(`Has LOS to (${losTargetSquare.coord.join(',')})? ${losExists}`);

// 7. Move the piece
if (piece.move(moveTargetSquare)) {
  console.log('\nMove successful!');
}

// 8. Show final state
console.log(`Piece is now at (${piece.square.coord.join(',')}).`);
console.log(`AP remaining: ${piece.apRemaining}`);

// --- GameCycle Example ---
console.log('\n\n--- Turn-Phase Machinery Example ---');
const game = new GameCycle();

console.log(`Initial Turn: ${game.turnNumber}, Phase: ${game.phase.name}`);

for (let i = 0; i < 5; i++) {
  game.step();
  console.log(`→ New Turn: ${game.turnNumber}, Phase: ${game.phase.name}`);
}
// --- End GameCycle Example ---

// --- Mission Loader Example ---
console.log('\n\n--- Mission Loader Example ---');

const missionPath = new URL('./missions/sampleMission.json', import.meta.url).pathname;
const mission = loadMissionSync(missionPath);
const engine = new GameEngine(mission);

console.log(`Loaded mission: "${mission.name}"`);
console.log('Board layout:');

let output = '';
for (let y = 0; y < engine.state.board.height; y++) {
  let row = '';
  for (let x = 0; x < engine.state.board.width; x++) {
    const square = engine.state.board.getSquare(x, y);
    row += square && square.sectionId !== -1 ? ' ■' : '  ';
  }
  output += row + '\n';
}
console.log(output);


console.log('\nTo run this example:');
console.log('1. Ensure ts-node is installed: pnpm add -D ts-node --filter ./packages/engine');
console.log('2. Run: pnpm --filter ./packages/engine example');
