export * from './board/Board.js';
export * from './board/Square.js';
export * from './GameEngine.js';
export { loadMission } from './missions/missionLoader.js';
export { missions } from './missions/index.js';
export * from './missions/missionTypes.js';
export { hasLineOfSight } from './board/los.js';

// Core game pieces and direction logic
export { Piece } from './pieces/Piece.js';
export type { Coord } from './pieces/Piece.js';
export { StormBolterMarine, SergeantMarine, SwordSergeantMarine } from './pieces/StormBolterMarine.js';
export { HeavyFlamerMarine } from './pieces/HeavyFlamerMarine.js';
export { AssaultCannonMarine, ChainFistMarine } from './pieces/AssaultCannonMarine.js';
export { AmbushCounter, deployAmbushCounter, drawAmbushValue } from './pieces/AmbushCounter.js';
export { flameFlood, igniteSquares, sectionSquares, clearFlames } from './rules/flame.js';
export { Dir } from './core/Direction.js';
export { AP_PER_TURN, MOVE_COST, TURN_COST } from './core/CostTables.js';

export { Door } from './rules/Door.js';
export * from './events/PieceEvents.js';
export { Feature } from './rules/Feature.js';
export { DOOR_FACING } from './rules/Door.js';
export { canSee, canShoot, inVisionArc, inFireArc, visibleSquares } from './board/vision.js';
export { toRelative, turn, DIR_VEC } from './core/Direction.js';
export { Genestealer } from './pieces/Genestealer.js';
export { SeededRng, RollQueue } from './core/Dice.js';
export type { DiceSource } from './core/Dice.js';
export { closeCombat, isFacing } from './rules/combat.js';
export type { CombatResult } from './rules/combat.js';
export type { PieceKind } from './pieces/Piece.js';
export { Blip } from './pieces/Blip.js';
export { runStealerActions, spawnBlips, convertRevealedBlips, squareSeenByMarine } from './ai/StealerAI.js';
export { runMarineTurn, autoplay } from './ai/MarineAutopilot.js';
export { DEPLOY_SECONDS_PER_SQUAD, deployFacing, deploySquadCount, deploySeconds, orderSquaresFrontToBack, autoDeployOrder } from './rules/deploy.js';
export { GameLogger, GAMELOG_FORMAT_VERSION } from './log/GameLogger.js';
export type { GameLog, GameLogMeta, LoggedEvent, LoggerEngine } from './log/GameLogger.js';
