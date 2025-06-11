export interface RawMissionJSON {
  name: string
  board: [number, number][]
}

export interface CompiledMission {
  name: string
  width: number
  height: number
  coords: [number, number][]
}
