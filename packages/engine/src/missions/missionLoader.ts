import { missions } from './index.js';
import type { CompiledMission, RawMissionJSON_v2 } from './missionTypes.js';

const missionCache = new Map<string, CompiledMission>();

function validateAndCompile(
  missionData: unknown,
): CompiledMission {
  const rawMission = missionData as RawMissionJSON_v2;
  // basic validation
  if (!rawMission.squares?.length) throw new Error('invalid mission: no squares');

  return {
    ...rawMission,
    squares: rawMission.squares.map(sq => ({ ...sq })),
  };
}

export function loadMission(missionName: keyof typeof missions): CompiledMission {
  if (missionCache.has(missionName)) {
    return missionCache.get(missionName)!;
  }

  const missionData = missions[missionName];
  if (!missionData) {
    throw new Error(`Mission not found: ${missionName}`);
  }

  const compiled = validateAndCompile(missionData);
  missionCache.set(missionName, compiled);

  return compiled;
}
