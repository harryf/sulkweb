export type SquareKind = 'corridor' | 'room'

export class Square {
  public readonly coord: [number, number]
  public readonly features: Set<any> = new Set()
  public readonly sectionId: number = -1;
  public passable: boolean = true;

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly kind: SquareKind | number = 'corridor',
    sectionId?: number,
  ) {
    this.coord = [x, y]
    // Handle legacy tests that pass a number as sectionId instead of SquareKind
    if (typeof kind === 'number') {
      this.sectionId = kind;
    } else if (sectionId !== undefined) {
      this.sectionId = sectionId;
    }
  }
}
