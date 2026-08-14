export interface SquareJSON {
  x: number
  y: number
  kind: 'corridor' | 'room'
  section?: number      // optional, for future
  doorFacing?: 'up'|'right'|'down'|'left'
}

export interface CoordJSON { x: number; y: number }

export interface DeploySquareJSON extends CoordJSON {
  facing?: 'up'|'right'|'down'|'left'
}

export interface RawMissionJSON_v2 {
  name: string
  width: number
  height: number
  squares: SquareJSON[]
  /** Genestealer blip entry squares. */
  entryPoints?: CoordJSON[]
  /** Marine escape squares — reaching one completes the exit objective. */
  exitPoints?: CoordJSON[]
  /** Marine starting squares, in deployment order. */
  marineDeployment?: DeploySquareJSON[]
  /** Blips placed before turn 1. */
  initialBlips?: number
  /** Blip reinforcements per stealer reinforcement phase. */
  blipsPerTurn?: number
  /** Total reinforcement budget (excluding initialBlips). Omit = unlimited. */
  totalBlips?: number
  /** Victory rule for the marines. */
  objective?: 'exterminate' | 'reach-exit' | 'exterminate-or-exit'
}

export type CompiledMission = RawMissionJSON_v2
