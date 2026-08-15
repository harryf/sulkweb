export interface SquareJSON {
  x: number
  y: number
  kind: 'corridor' | 'room'
  /** Board section per the original BOARD sublists — flamer/self-destruct blast unit. */
  section?: number
  doorFacing?: 'up'|'right'|'down'|'left'
}

export interface CoordJSON { x: number; y: number }

/** Entry/exit square: `facing` is the original `efacing` — the direction OFF
 *  the board where the EntryTriangle/ExitArrow graphic sits (misc.py). */
export interface EntrySquareJSON extends CoordJSON {
  facing?: 'up'|'right'|'down'|'left'
}

export type MarineType = 'storm_bolter' | 'sergeant' | 'heavy_flamer'
  | 'assault_cannon' | 'chain_fist' | 'sergeant_sword'

export interface DeploySquareJSON extends CoordJSON {
  facing?: 'up'|'right'|'down'|'left'
  /** Marine variant deployed here; defaults to storm_bolter. */
  type?: MarineType
  /** Original squad name (MARINES roster) — cosmetic grouping for the roster UI. */
  squad?: string
}

export interface RawMissionJSON_v2 {
  name: string
  width: number
  height: number
  squares: SquareJSON[]
  /** Genestealer blip entry squares. */
  entryPoints?: EntrySquareJSON[]
  /** Marine escape squares — reaching one completes the exit objective. */
  exitPoints?: EntrySquareJSON[]
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
    | 'escort-cat' | 'flame-objectives' | 'escape-count' | 'defend' | 'download'
  /** Objective square for flame-objective (e.g. Launch Control). Marines win
   *  when it is flaming; they LOSE when no living flamer has ammo left. */
  objectivePoint?: CoordJSON
  /** kill-quota missions (original mission 2 "Exterminate"): marines win when
   *  stealer-side casualties reach this count (blips count their hidden VALUE,
   *  per pieces.py kill()) OR every entry square has a marine within 6 squares
   *  (original get_team_is_near blockade). Loss on squad wipe. */
  killQuota?: number
  /** flame-objectives (mission 4 "Cleanse and Burn"): every one of these
   *  squares must burn at least once (permanently "cleansed"); loss the moment
   *  no living flamer has ammo before that. */
  objectivePoints?: CoordJSON[]
  /** escort-cat (mission 3 "Rescue"): where the C.A.T. starts (an Ilyich
   *  deploy square — original places it WITHSQUAD). */
  catStart?: CoordJSON
  /** escape-count missions: marines win when this many have left the board
   *  via an EXIT square; loss when alive + escaped drops below it. */
  escapeQuota?: number
  /** defend (mission 6): marines win at the END of this turn number. */
  turnLimit?: number
  /** defend: per-mission heavy-flamer ammo override (original
   *  post_deploy_script sets it to 4). */
  flamerAmmo?: number
  /** defend: O:2 squares carrying destructible ducting — any destroyed = loss. */
  ductingSquares?: CoordJSON[]
  /** defend: O:1 control-room squares — any flaming = loss. */
  roomSquares?: CoordJSON[]
  /** download (beta_2): the Data Room square a sergeant must hold. */
  downloadPoint?: CoordJSON
  /** download: end-phases the sergeant must remain (counter start; original 4). */
  downloadTurns?: number
  /** beta_2 USE_AMBUSH_COUNTERS: the stealer side drops decoy counters. */
  useAmbushCounters?: boolean
}

export type CompiledMission = RawMissionJSON_v2
