export * from './board/Board.js';
export * from './board/Square.js';
export * from './GameEngine.js';
export { loadMission } from './missions/missionLoader.js';
export * from './missions/missionTypes.js';
export { hasLineOfSight } from './board/los.js';

// Core game pieces and direction logic
export { Piece } from './pieces/Piece.js';
export type { Coord } from './pieces/Piece.js';
export { StormBolterMarine } from './pieces/StormBolterMarine.js';
export { Dir } from './core/Direction.js';
export { AP_PER_TURN, MOVE_COST, TURN_COST } from './core/CostTables.js';

// Old exports, potentially for example.ts or legacy code - review if still needed
// export { Piece as OldPiece } from './rules/Piece.js'; // Example of renaming if needed
export { Door } from './rules/Door.js';
export { GameCycle } from './GameCycle.js';
export { Selection } from './ui/Selection.js';
