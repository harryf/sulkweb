/**
 * Centralised selection state: one marine (direct control and individual
 * orders) or one squad (squad orders, stage 3). The two are exclusive:
 * selecting a marine drops the squad and the reverse, and `clear` drops both.
 *
 * The squad slot also holds `Selection.ALL`, the all-squads stop Tab reaches
 * past the last squad (stage 4): it selects like any squad name, and the
 * orders it takes go out as one mission order to every squad.
 */
export class Selection {
  /** The all-squads selection: every squad at once, the mission-order target. */
  static readonly ALL = '*'
  private static current: string | null = null
  private static squad: string | null = null
  /** returns previously-selected id (or null) */
  static select(id: string) {
    const prev = this.current
    this.current = id
    this.squad = null
    return prev
  }
  static toggle(id: string) {
    this.squad = null
    if (this.current === id) this.current = null
    else this.current = id
  }
  static clear() { this.current = null; this.squad = null }
  static get(): string | null { return this.current }
  /** Select a squad by name, or `Selection.ALL` for every squad at once
   *  (null drops it); the marine selection goes either way. */
  static selectSquad(name: string | null) {
    this.squad = name
    if (name !== null) this.current = null
  }
  static getSquad(): string | null { return this.squad }
  /** True while every squad is selected (Tab's stop past the last squad). */
  static isAll(): boolean { return this.squad === Selection.ALL }
}
