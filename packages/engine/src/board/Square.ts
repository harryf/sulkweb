export type SquareKind = 'corridor' | 'room'

export class Square {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly kind: SquareKind = 'corridor',
  ) {}
}
