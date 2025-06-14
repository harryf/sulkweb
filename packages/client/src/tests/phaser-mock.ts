// @ts-nocheck - Disable type checking for mock file with intentionally unused parameters
import { vi } from 'vitest';

// Create mocks for Phaser classes
const mockReturnThis = () => vi.fn().mockReturnThis();

// A dummy Scene class that GameScene can extend
export const Scene = class Scene {
  constructor() {}
  add: any;
  children: any;
  events: any = { on: vi.fn() };
  input: any;
  cameras: any;
  load: any = { image: vi.fn() };
};

// A dummy Container class for Minimap to extend
export const Container = class Container {
  constructor(scene: any) {}
  add(child: any) { return this; }
  setScrollFactor(factor: number) { return this; }
  setPosition(x: number, y: number) { return this; }
};

// A dummy Image class for HighlightSprite to extend
export const Image = class Image {
  constructor(scene: any, x: number, y: number, texture: string) {}
  setOrigin = mockReturnThis();
  setDisplaySize = mockReturnThis();
  setDepth = mockReturnThis();
  setPosition = mockReturnThis();
  setVisible = mockReturnThis();
  setAlpha = mockReturnThis();
  setRotation = mockReturnThis();
};

// Mock the 'phaser' module
vi.mock('phaser', () => {
  return {
    default: {
      Scene,
      GameObjects: {
        Container,
        Graphics: class Graphics {
          constructor(scene: any) {}
          clear = mockReturnThis();
          lineStyle = mockReturnThis();
          strokeRect = mockReturnThis();
        },
        Image
      },
      Math: {
        Clamp: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
        Vector2: class Vector2 {
          x: number;
          y: number;
          constructor(x: number = 0, y: number = 0) {
            this.x = x;
            this.y = y;
          }
        }
      },
      Input: {
        Pointer: class Pointer {
          leftButtonDown() { return true; }
          positionToCamera(camera: any) {
            return { x: 0, y: 0 };
          }
        }
      }
    },
    Scene,
  };
});
