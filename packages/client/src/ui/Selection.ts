/**
 * Centralised selection state: one marine (direct control and individual
 * orders) or one squad (squad orders, stage 3). The two are exclusive:
 * selecting a marine drops the squad and the reverse, and `clear` drops both.
 */
export class Selection {
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
  /** Select a squad by name (null drops it); the marine selection goes. */
  static selectSquad(name: string | null) {
    this.squad = name
    if (name !== null) this.current = null
  }
  static getSquad(): string | null { return this.squad }
}
