export interface SquareJSON {
  x: number
  y: number
  kind: 'corridor' | 'room'
  section?: number      // optional, for future
  doorFacing?: 'up'|'right'|'down'|'left'
}

export interface RawMissionJSON_v2 {
  name: string
  width: number
  height: number
  squares: SquareJSON[]
}

export type CompiledMission = RawMissionJSON_v2
