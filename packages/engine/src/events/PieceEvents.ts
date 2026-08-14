export type ApInfo = { apRemaining: number; apInitial: number }

export type PieceEventsType = {
  /** Selection changed. `ap` is present when a piece is selected. */
  selected: { pieceId: string | null; ap?: ApInfo }
  apChanged: { pieceId: string } & ApInfo
  doorToggled: { x: number; y: number; open: boolean }
}

type Handler<T> = (payload: T) => void

/** Minimal typed pub/sub — mitt-compatible surface, no dependency. */
class Emitter<Events extends Record<string, unknown>> {
  readonly all = new Map<keyof Events, Handler<never>[]>()

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
    for (const handler of [...(this.all.get(type) ?? [])]) {
      (handler as Handler<Events[K]>)(payload)
    }
  }
}

export const PieceEvents = new Emitter<PieceEventsType>()
