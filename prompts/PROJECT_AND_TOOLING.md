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

## Testing Phaser Components

The client package uses Vitest for unit testing Phaser components. When writing tests for Phaser components, follow these guidelines:

### Mocking Phaser Objects
- Create chainable mock methods using `vi.fn().mockReturnThis()` for Phaser objects like images and graphics
- Mock `scene.add.existing` to properly track children additions
- Add dimensions (width/height) to camera mocks to prevent NaN errors in calculations
- For testing camera panning, add a custom `update` method that simulates the real GameScene update logic
- Ensure all required methods are mocked on Phaser objects (e.g., `setAlpha`, `setPosition`, `setRotation`, etc.)
- Mock event handlers like `scene.input.keyboard.on` to handle keyboard event listeners
- Include properties like `x`, `y`, `angle` on mock image objects to support calculations and transformations

### Common Testing Patterns
- When testing with Minimap, be aware that images may be created twice (once by GameScene, once by Minimap)
- Use flexible assertions for camera bounds and positions that check for valid values rather than exact matches
- Use `as any` type casting when accessing mock properties like `.mock.calls`

### Example
```typescript
// Mock scene.add.image with chainable methods
scene.add = {
  image: vi.fn(() => {
    const mockImage = { 
      setOrigin: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setTint: vi.fn().mockReturnThis()
    };
    return mockImage;
  }),
  existing: vi.fn((obj) => {
    children.push(obj);
    return obj;
  })
} as any;

// Add width and height to camera mock
scene.cameras = { 
  main: { 
    setBounds: vi.fn(), 
    centerOn: vi.fn(), 
    width: 800, 
    height: 600,
    scrollX: 0,
    scrollY: 0
  } 
} as any;
```

## Glossary
- **Square**: Basic unit of the game board
- **Board**: Collection of squares forming the game map
- **LOS**: Line of Sight calculations
- **Feature**: Game elements that can be placed on squares (doors, etc.)
- **Piece**: Game pieces that can move on the board
- **Phase**: Different phases of the game turn cycle
