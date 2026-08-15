export interface SquareJSON {
  x: number
  y: number
  kind: 'corridor' | 'room'
  /** Board section per the original BOARD sublists — flamer/self-destruct blast unit. */
  section?: number
  doorFacing?: 'up'|'right'|'down'|'left'
}

export interface CoordJSON { x: number; y: number }

export type MarineType = 'storm_bolter' | 'sergeant' | 'heavy_flamer'

export interface DeploySquareJSON extends CoordJSON {
  facing?: 'up'|'right'|'down'|'left'
  /** Marine variant deployed here; defaults to storm_bolter. */
  type?: MarineType
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
  objective?: 'exterminate' | 'reach-exit' | 'exterminate-or-exit' | 'flame-objective' | 'kill-quota'
  /** Objective square for flame-objective (e.g. Launch Control). Marines win
   *  when it is flaming; they LOSE when no living flamer has ammo left. */
  objectivePoint?: CoordJSON
  /** kill-quota missions (original mission 2 "Exterminate"): marines win when
   *  stealer-side casualties reach this count (blips count their hidden VALUE,
   *  per pieces.py kill()) OR every entry square has a marine within 6 squares
   *  (original get_team_is_near blockade). Loss on squad wipe. */
  killQuota?: number
}

export type CompiledMission = RawMissionJSON_v2
