export interface Coord { c: number; r: number }        // column, row

/**
 * Tiny state container used by the scene; framework-agnostic.
 */
export class SelectionManager {
  private _current: Coord | null = null;

  /** Current selected square (null == none) */
  get current(): Coord | null { return this._current }

  /**
   * Toggle selection. Returns the new current selection or null.
   * If `coord` equals the current one => deselect (returns null).
   */
  toggle(coord: Coord): Coord | null {
    if (this._current &&
        this._current.c === coord.c &&
        this._current.r === coord.r) {
      this._current = null;
    } else {
      this._current = coord;
    }
    return this._current;
  }
}
