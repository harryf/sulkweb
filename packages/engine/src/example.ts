import { Board } from './board/Board';
import { hasLineOfSight } from './board/los';

// 1. Create a board
// For this example, we'll make a simple 5x5 board with no specific sections.
// Section map can be an empty array for a board where all squares default to sectionId -1.
const board = new Board(5, 5, []);

console.log('Created a 5x5 board.');

// 2. Define start and end squares
const startSquare = board.getSquare(1, 1);
const endSquare = board.getSquare(4, 4);

if (!startSquare || !endSquare) {
  console.error('Could not find start or end square. Exiting.');
  process.exit(1);
}

console.log(`Start square: (${startSquare.coord.join(',')})`);
console.log(`End square: (${endSquare.coord.join(',')})`);

// 3. Optionally, add a blocker
const blockerSquareCoord: [number, number] | null = [2, 2]; // Set to null to have no blocker

if (blockerSquareCoord) {
  const blocker = board.getSquare(blockerSquareCoord[0], blockerSquareCoord[1]);
  if (blocker) {
    blocker.features.add('BLOCK_LOS');
    console.log(`Added a blocker at (${blocker.coord.join(',')})`);
  } else {
    console.warn(`Could not find blocker square at (${blockerSquareCoord.join(',')})`);
  }
}

// 4. Check for Line of Sight
const losExists = hasLineOfSight(board, startSquare, endSquare);

// 5. Print the result
console.log(`Line of sight from (${startSquare.coord.join(',')}) to (${endSquare.coord.join(',')})? ${losExists}`);

console.log('\nTo run this example:');
console.log('1. Ensure ts-node is installed: pnpm add -D ts-node --filter ./packages/engine');
console.log('2. Run: pnpm --filter ./packages/engine example');
