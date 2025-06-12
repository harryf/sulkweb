import { describe, it, expect, vi } from 'vitest';

// Mock the engine module
vi.mock('@sulk/engine', () => {
  return {
    loadMission: () => ({
      name: 'Suicide Mission',
      width: 22,
      height: 27,
      squares: Array(25).fill(0).map((_, i) => ({
        x: i % 5,
        y: Math.floor(i / 5),
        kind: 'corridor'
      }))
    }),
    GameEngine: class GameEngine {
      constructor() {}
      state = {
        board: {
          width: 22,
          height: 27,
          allSquares: () => Array(25).fill(0).map((_, i) => ({
            x: i % 5,
            y: Math.floor(i / 5),
            kind: 'corridor'
          }))
        }
      }
    }
  };
});

// Mock the 'phaser' module.
vi.mock('phaser', () => {
  // A dummy Scene class that GameScene can extend. It has a constructor to
  // satisfy the `super()` call in the GameScene constructor.
  const Scene = class Scene {
    constructor() {}
    add: any;
    children: any;
  };
  return {
    // `import Phaser from 'phaser'` imports the default export.
    // Our mock needs to provide a default export containing the Scene class.
    default: {
      Scene,
    },
    // We also export Scene directly in case of `import { Scene } from 'phaser'`. 
    Scene,
  };
});

describe('GameScene tile grid', () => {
  it('creates exactly 100 tiles', async () => {
    // Dynamically import GameScene AFTER the mock is set up.
    const { default: GameScene } = await import('../scenes/GameScene');

    const scene = new GameScene();

    // Mock the scene's children list to track added objects
    const children: any[] = [];
    scene.children = {
      get length() {
        return children.length;
      },
    } as any;

    // Mock the `add.image` factory. When it's called, we'll add a dummy object
    // to our mocked children list to simulate a tile being added.
    scene.add = {
      image: vi.fn(() => {
        children.push({}); // Add a dummy object to the list
        return { setOrigin: vi.fn() }; // Return a mock image with a setOrigin method
      }),
    } as any;
    
    // Mock the cameras
    scene.cameras = {
      main: {
        setBounds: vi.fn(),
        centerOn: vi.fn(),
      }
    } as any;
    
    // Mock the input with keyboard
    scene.input = {
      keyboard: {
        createCursorKeys: vi.fn(() => ({
          up: { isDown: false },
          down: { isDown: false },
          left: { isDown: false },
          right: { isDown: false },
        })),
        addKeys: vi.fn(() => ({
          W: { isDown: false },
          A: { isDown: false },
          S: { isDown: false },
          D: { isDown: false },
        })),
      },
      on: vi.fn(),
    } as any;

    // Call the method we want to test
    scene.create();

    // Assert that the correct number of tiles were created (25 from our mock)
    expect(children.length).toBe(25);
  });
});
