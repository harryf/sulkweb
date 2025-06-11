import fs from 'node:fs'
import path from 'node:path'
import { RawMissionJSON, CompiledMission } from './missionTypes'

/** Throws if JSON invalid. */
export function loadMissionSync(jsonPath: string): CompiledMission {
  const raw = JSON.parse(
    fs.readFileSync(path.resolve(jsonPath), 'utf-8')
  ) as RawMissionJSON

  // basic validation
  if (!raw.board?.length) throw new Error('board missing/empty')

  const xs = raw.board.map(c => c[0])
  const ys = raw.board.map(c => c[1])
  const width  = Math.max(...xs) + 1
  const height = Math.max(...ys) + 1

  return {
    name: raw.name,
    width,
    height,
    coords: raw.board
  }
}
