import { describe, it, expect } from 'vitest';
import * as Engine from '../index';
import { Board } from '../board/Board';
import { Square } from '../board/Square';
import { hasLineOfSight } from '../board/los';

describe('Engine Barrel File', () => {
  it('should export all the required components', () => {
    expect(Engine.Board).toBe(Board);
    expect(Engine.Square).toBe(Square);
    expect(Engine.hasLineOfSight).toBe(hasLineOfSight);
  });
});
