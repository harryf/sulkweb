import { describe, it, expect, vi } from 'vitest';
import spaceHulk1MissionData from '../../../engine/src/missions/space_hulk_1.json';

// Mock the engine module
vi.mock('@sulk/engine', () => {
  return {
    loadMission: (missionName: string) => {
      // Ensure we're returning the full, real mission data for the relevant mission
      if (missionName === 'space_hulk_1') {
        return spaceHulk1MissionData;
      }
      // Fallback for any other mission name, though not strictly needed if GameScene only loads one
      return { name: 'Default Mock Mission', width: 1, height: 1, squares: [{x:0, y:0, kind: 'corridor'}]};
    },
    GameEngine: class GameEngine {
      constructor(missionData: any) { // GameEngine is constructed with missionData
        this.state.board.width = missionData.width;
        this.state.board.height = missionData.height;
        this.state.board.allSquares = () => missionData.squares;
      }
      state = {
        board: {
          width: spaceHulk1MissionData.width, // Initial default, overridden by constructor
          height: spaceHulk1MissionData.height, // Initial default, overridden by constructor
          allSquares: () => spaceHulk1MissionData.squares // Initial default, overridden by constructor
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

describe('GameScene rendering and setup', () => {
  it('correctly renders the Suicide Mission map and sets up the camera', async () => {
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

    // Assert that the correct number of tiles were created
    expect(children.length).toBe(spaceHulk1MissionData.squares.length);

    // Assert correct textures were used for each tile
    const imageCalls = (scene.add.image as any).mock.calls;
    expect(imageCalls.length).toBe(spaceHulk1MissionData.squares.length);

    spaceHulk1MissionData.squares.forEach((sq: any, index: number) => {
      const expectedTexture = sq.kind === 'corridor' ? 'square_corridor' : 'square_room';
      expect(imageCalls[index][2]).toBe(expectedTexture); // Argument 2 is the texture key
    });

    // Assert camera setup
    const TILE_SIZE = 40; // Matches TILE_SIZE in GameScene.ts
    expect(scene.cameras.main.setBounds).toHaveBeenCalledWith(
      0,
      0,
      spaceHulk1MissionData.width * TILE_SIZE,
      spaceHulk1MissionData.height * TILE_SIZE
    );

    const expectedCenterX = Math.floor(spaceHulk1MissionData.width / 2) * TILE_SIZE;
    const expectedCenterY = Math.floor(spaceHulk1MissionData.height / 2) * TILE_SIZE;
    expect(scene.cameras.main.centerOn).toHaveBeenCalledWith(expectedCenterX, expectedCenterY);
  });

  it('pans the camera with arrow keys', async () => {
    const { default: GameScene } = await import('../scenes/GameScene');
    const scene = new GameScene() as any; // Use 'as any' for easier mocking of scene properties

    // Basic scene setup mocks (simplified as rendering is tested elsewhere)
    scene.children = { get length() { return 0; } } as any;
    scene.add = { image: vi.fn(() => ({ setOrigin: vi.fn() })) } as any;
    scene.cameras = { main: { setBounds: vi.fn(), centerOn: vi.fn(), scrollX: 0, scrollY: 0 } } as any;

    const mockCursors = {
      up: { isDown: false },
      down: { isDown: false },
      left: { isDown: false },
      right: { isDown: false },
    };
    const mockWasd = { // Need to mock WASD as well, even if not used in this specific test block, due to GameScene's create() method
      W: { isDown: false },
      A: { isDown: false },
      S: { isDown: false },
      D: { isDown: false },
    };

    scene.input = {
      keyboard: {
        createCursorKeys: vi.fn(() => mockCursors),
        addKeys: vi.fn(() => mockWasd),      },
      on: vi.fn(),
    } as any;

    scene.create(); // Call create to initialize cursors, etc.

    const initialScrollX = scene.cameras.main.scrollX;
    const initialScrollY = scene.cameras.main.scrollY;
    const speed = 5;

    // Test Left Arrow
    mockCursors.left.isDown = true;
    scene.update();
    expect(scene.cameras.main.scrollX).toBe(initialScrollX - speed);
    mockCursors.left.isDown = false;
    scene.cameras.main.scrollX = initialScrollX; // Reset for next check

    // Test Right Arrow
    mockCursors.right.isDown = true;
    scene.update();
    expect(scene.cameras.main.scrollX).toBe(initialScrollX + speed);
    mockCursors.right.isDown = false;
    scene.cameras.main.scrollX = initialScrollX;

    // Test Up Arrow
    mockCursors.up.isDown = true;
    scene.update();
    expect(scene.cameras.main.scrollY).toBe(initialScrollY - speed);
    mockCursors.up.isDown = false;
    scene.cameras.main.scrollY = initialScrollY;

    // Test Down Arrow
    mockCursors.down.isDown = true;
    scene.update();
    expect(scene.cameras.main.scrollY).toBe(initialScrollY + speed);
    mockCursors.down.isDown = false;
  });

  it('pans the camera with WASD keys', async () => {
    const { default: GameScene } = await import('../scenes/GameScene');
    const scene = new GameScene() as any;

    scene.children = { get length() { return 0; } } as any;
    scene.add = { image: vi.fn(() => ({ setOrigin: vi.fn() })) } as any;
    scene.cameras = { main: { setBounds: vi.fn(), centerOn: vi.fn(), scrollX: 0, scrollY: 0 } } as any;

    const mockCursors = { // Need to mock cursors as well
      up: { isDown: false },
      down: { isDown: false },
      left: { isDown: false },
      right: { isDown: false },
    };
    const mockWasd = {
      W: { isDown: false },
      A: { isDown: false },
      S: { isDown: false },
      D: { isDown: false },
    };

    scene.input = {
      keyboard: {
        createCursorKeys: vi.fn(() => mockCursors),
        addKeys: vi.fn(() => mockWasd),
      },
      on: vi.fn(),
    } as any;

    scene.create();

    const initialScrollX = scene.cameras.main.scrollX;
    const initialScrollY = scene.cameras.main.scrollY;
    const speed = 5;

    // Test A Key (Left)
    mockWasd.A.isDown = true;
    scene.update();
    expect(scene.cameras.main.scrollX).toBe(initialScrollX - speed);
    mockWasd.A.isDown = false;
    scene.cameras.main.scrollX = initialScrollX;

    // Test D Key (Right)
    mockWasd.D.isDown = true;
    scene.update();
    expect(scene.cameras.main.scrollX).toBe(initialScrollX + speed);
    mockWasd.D.isDown = false;
    scene.cameras.main.scrollX = initialScrollX;

    // Test W Key (Up)
    mockWasd.W.isDown = true;
    scene.update();
    expect(scene.cameras.main.scrollY).toBe(initialScrollY - speed);
    mockWasd.W.isDown = false;
    scene.cameras.main.scrollY = initialScrollY;

    // Test S Key (Down)
    mockWasd.S.isDown = true;
    scene.update();
    expect(scene.cameras.main.scrollY).toBe(initialScrollY + speed);
    mockWasd.S.isDown = false;
  });
});
