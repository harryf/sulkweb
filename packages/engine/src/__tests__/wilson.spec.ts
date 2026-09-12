import { describe, it, expect } from 'vitest';
import { wilson } from '../../scripts/scan.js';

/**
 * The scan's confidence interval. Importing the module must not run the CLI:
 * the scan guards its main on import.meta.main, which is false here.
 */
describe('wilson score interval', () => {
  it('returns a zero-width interval for an empty sample', () => {
    expect(wilson(0, 0)).toEqual({ lo: 0, hi: 0 });
  });

  it('stays inside [0, 1] at both extremes', () => {
    const none = wilson(0, 30);
    expect(none.lo).toBe(0);
    expect(none.hi).toBeGreaterThan(0);
    const all = wilson(30, 30);
    expect(all.hi).toBe(1);
    expect(all.lo).toBeLessThan(1);
  });

  it('brackets the observed rate', () => {
    const { lo, hi } = wilson(12, 40);
    expect(lo).toBeLessThan(0.3);
    expect(hi).toBeGreaterThan(0.3);
  });

  it('matches the published value for 10 of 20 at z 1.96', () => {
    const { lo, hi } = wilson(10, 20);
    expect(lo).toBeCloseTo(0.2993, 3);
    expect(hi).toBeCloseTo(0.7007, 3);
  });

  it('narrows as the sample grows at a fixed rate', () => {
    const small = wilson(5, 10);
    const large = wilson(500, 1000);
    expect(large.hi - large.lo).toBeLessThan(small.hi - small.lo);
  });
});
