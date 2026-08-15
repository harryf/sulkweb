export type ApInfo = { apRemaining: number; apInitial: number }

export type PieceEventsType = {
  /** Selection changed. `ap` is present when a piece is selected; `ammo` when it carries a limited-ammo weapon. */
  selected: { pieceId: string | null; ap?: ApInfo; ammo?: number }
  apChanged: { pieceId: string } & ApInfo
  doorToggled: { x: number; y: number; facing: number; open: boolean }
  pieceMoved: { pieceId: string; x: number; y: number; facing: number }
  shot: { shooterId: string; targetId: string; x: number; y: number; rolls: number[]; hit: boolean }
  pieceDied: { pieceId: string; kind: string; x: number; y: number }
  closeCombat: { attackerId: string; defenderId: string; attackerRolls: number[]; defenderRolls: number[]; outcome: 'attacker' | 'defender' | 'draw' }
  overwatchChanged: { pieceId: string; on: boolean }
  blipConverted: { blipId: string; x: number; y: number; stealerIds: string[]; lost: number }
  pieceAdded: { pieceId: string; kind: string; x: number; y: number; facing: number }
  phaseChanged: { phase: string; turn: number }
  cpChanged: { cp: number }
  gameOver: { result: string }
  /** Bolter jam state changed (jam on overwatch doubles; unjam action). */
  jammed: { pieceId: string; jammed: boolean }
  /** Heavy flamer torched a section (or self-destructed into its own). */
  sectionFlamed: { shooterId: string; squares: { x: number; y: number }[]; kills: string[] }
  /** End-phase flame dispersal. */
  flamesCleared: { squares: { x: number; y: number }[] }
  /** Flamer ammo changed. */
  ammoChanged: { pieceId: string; ammo: number }
}

type Handler<T> = (payload: T) => void

export type CapturedEvent<Events> = { type: keyof Events; payload: Events[keyof Events] }

/** Minimal typed pub/sub — mitt-compatible surface, no dependency. */
class Emitter<Events extends Record<string, unknown>> {
  readonly all = new Map<keyof Events, Handler<never>[]>()
  private capturing: CapturedEvent<Events>[] | null = null

  /**
   * True while a captured stream is being re-emitted for animation. Replayed
   * events describe PAST state — engine handlers that MUTATE state on events
   * (e.g. sight-conversion) must ignore them or they re-run rules against the
   * final board mid-replay. View handlers ignore this flag.
   */
  replaying = false

  /** Re-emit a captured event, marked as replay so state-mutating handlers skip it. */
  replay(ev: CapturedEvent<Events>): void {
    this.replaying = true
    try {
      this.emit(ev.type as never, ev.payload as never)
    } finally {
      this.replaying = false
    }
  }

  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): void {
    const list = this.all.get(type) ?? []
    list.push(handler as Handler<never>)
    this.all.set(type, list)
  }

  off<K extends keyof Events>(type: K, handler: Handler<Events[K]>): void {
    const list = this.all.get(type)
    if (!list) return
    const i = list.indexOf(handler as Handler<never>)
    if (i >= 0) list.splice(i, 1)
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    if (this.capturing) {
      this.capturing.push({ type, payload })
      return
    }
    for (const handler of [...(this.all.get(type) ?? [])]) {
      (handler as Handler<Events[K]>)(payload)
    }
  }

  /**
   * Run `fn` with every emission buffered instead of delivered; returns the
   * ordered stream for the caller to re-emit on its own timeline (the client
   * uses this to animate the stealer phase). CAUTION: handlers do NOT run
   * during capture — engine logic must not depend on event delivery for
   * anything that happens inside the captured section.
   */
  capture(fn: () => void): CapturedEvent<Events>[] {
    const buffer: CapturedEvent<Events>[] = []
    const prev = this.capturing
    this.capturing = buffer
    try { fn() } finally { this.capturing = prev }
    return buffer
  }
}

export const PieceEvents = new Emitter<PieceEventsType>()
