# Project and Tooling Overview

## Key Directory Map
- `/packages/client` - Phaser-based frontend for the game
- `/packages/engine` - Core game logic and rules implementation
- `/packages/client/src/scenes` - Phaser scene implementations
- `/packages/engine/src/board` - Board representation and line-of-sight calculations
- `/packages/engine/src/missions` - Mission data and loader functionality
- `/packages/engine/src/rules` - Game rules implementation (pieces, doors, movement)
- `/packages/engine/src/phases` - Game phase and turn management
- `/prompts` - Documentation and AI prompt files

## Naming, Layout and Coding Conventions
- TypeScript with ES2022 target and NodeNext module system
- ES modules with explicit `.js` extensions in imports (even for TypeScript files)
- Strict TypeScript configuration with all strict checks enabled
- Test files in `__tests__` directories or `tests` directories
- Monorepo structure with workspace dependencies

## Toolchain
| Purpose | Tool | Main Config File |
|---------|------|------------------|
| Package Manager | pnpm | package.json |
| Client Bundler | Vite | packages/client/vite.config.ts |
| Testing | Vitest | packages/client/vitest.config.ts |
| TypeScript | TypeScript | tsconfig.base.json |
| E2E Testing | Playwright | TODO: Find playwright config |

## Running Unit Tests
```bash
pnpm test
```

For coverage reports:
```bash
pnpm --filter ./packages/engine test
```

## Starting the App Locally
```bash
pnpm --filter ./packages/client dev
```

The client will be available at http://localhost:5173 by default.

## Build for Production
```bash
pnpm build
```

This will build both the engine and client packages. The client build artifacts will be in `packages/client/dist`.

## Additional Notes

### Module Resolution
The project uses the NodeNext module system which requires explicit `.js` extensions in import statements, even though the actual files have `.ts` extensions. This is a common source of errors.

### Mission JSON Files
Mission JSON files must be placed in the `packages/engine/src/missions` directory and imported with the correct syntax:
```typescript
import missionName from './mission_file.json' with { type: 'json' };
```

### Engine Example Script
The engine package includes an example script that can be run to manually inspect engine functionality:
```bash
pnpm --filter ./packages/engine example
```

## Glossary
- **Square**: Basic unit of the game board
- **Board**: Collection of squares forming the game map
- **LOS**: Line of Sight calculations
- **Feature**: Game elements that can be placed on squares (doors, etc.)
- **Piece**: Game pieces that can move on the board
- **Phase**: Different phases of the game turn cycle
