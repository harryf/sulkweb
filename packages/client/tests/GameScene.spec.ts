import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import Phaser from 'phaser';
import GameScene from '../src/scenes/GameScene.js';
import { Selection } from '@sulk/engine/index.js';
let highlightMock: any;

// Mock the entire phaser module
vi.mock('phaser', () => {
  const originalPhaser = vi.importActual('phaser');
  const mockScene = {
    add: {
      image: vi.fn().mockReturnThis(),
      existing: vi.fn().mockReturnThis(),
    },
    input: {
      on: vi.fn(),
      keyboard: {
        createCursorKeys: vi.fn(() => ({ up: {}, down: {}, left: {}, right: {} })),
        addKeys: vi.fn(() => ({ W: {}, A: {}, S: {}, D: {} })),
        on: vi.fn(),
      },
    },
    children: {
      list: [],
      getByName: vi.fn(() => [])
    },
    cameras: {
      main: {
        setBounds: vi.fn(),
        centerOn: vi.fn(),
        width: 800,
        height: 600,
      }
    },
    load: {
      image: vi.fn(),
    },
    events: {
      on: vi.fn(),
    }
  };

  return {
    ...originalPhaser,
    Scene: class MockScene {
      constructor() {
        Object.assign(this, mockScene);
      }
    },
  };
});

vi.mock('../src/ui/HighlightSprite.js', () => {
  return {
    HighlightSprite: vi.fn().mockImplementation(function() {
      highlightMock = {
        follow: vi.fn(),
        hide: vi.fn(),
        setVisible: vi.fn(),
        setPosition: vi.fn(),
        setRotation: vi.fn(),
      };
      return highlightMock;
    })
  };
});

describe('GameScene: Piece Selection and Movement', () => {
  let gameScene: GameScene;
  let mockPieceSprite: any;

  beforeEach(() => {
    vi.clearAllMocks();
    Selection.clear();

    gameScene = new GameScene();

    // Manually call create, as the scene lifecycle is mocked
    gameScene.create();

    // Setup a mock piece sprite
    mockPieceSprite = {
      x: 100,
      y: 100,
      rotation: 0,
      name: 'piece',
      pieceId: gameScene['engine'].state.pieces[0].id,
      getBounds: vi.fn(() => new Phaser.Geom.Rectangle(80, 80, 40, 40)),
      setVisible: vi.fn(),
      setRotation: vi.fn(function(this: any, r: number) { this.rotation = r; return this; }),
      setPosition: vi.fn(function(this: any, x: number, y: number) { this.x = x; this.y = y; return this; }),
    };

    // Add the mock sprite to the scene's children list for hit detection
    (gameScene.children.list as any).push(mockPieceSprite);
    gameScene['pieceSprites'][mockPieceSprite.pieceId] = mockPieceSprite;
  });

  it('should select a piece on click and show the highlight', () => {
    // Simulate a click on the piece
    const pointer = { worldX: 100, worldY: 100 };
    const pointerDownCallback = (gameScene.input.on as Mock).mock.calls.find((call: any[]) => call[0] === 'pointerdown')[1];
    pointerDownCallback(pointer);

    // Assertions
    expect(Selection.get()).toBe(mockPieceSprite.pieceId);
    expect(highlightMock.follow).toHaveBeenCalledWith(mockPieceSprite);
  });

  it('should move the selected piece and update the highlight', () => {
    // First, select the piece
    Selection.select(mockPieceSprite.pieceId);
    (gameScene as any).updateHighlight();

    // Simulate 'W' key press for moving forward
    const keydownCallback = (gameScene.input.keyboard!.on as Mock).mock.calls[0][1];
    const wasd = gameScene['wasd'];
    vi.spyOn(Phaser.Input.Keyboard, 'JustDown').mockImplementation(key => key === wasd.W);
    keydownCallback({} as KeyboardEvent);

    // Assertions
    expect(mockPieceSprite.setPosition).toHaveBeenCalled();
    expect(highlightMock.follow).toHaveBeenCalledWith(mockPieceSprite);

    // Clean up spy
    vi.mocked(Phaser.Input.Keyboard.JustDown).mockRestore();
  });
});
