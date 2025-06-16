/** Centralised selection state for the current turn */
export class Selection {
  private static current: string | null = null
  /** returns previously-selected id (or null) */
  static select(id: string) {
    const prev = this.current
    this.current = id
    return prev
  }
  static toggle(id: string) {
    if (this.current === id) this.current = null
    else this.current = id
  }
  static clear() { this.current = null }
  static get(): string | null { return this.current }
}
