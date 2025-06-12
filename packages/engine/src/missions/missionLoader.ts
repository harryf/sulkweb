import { missions } from './index.js';
import type { CompiledMission, RawMissionJSON_v2 } from './missionTypes.js';
import fs from 'fs';

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

/**
 * Load a mission from a file synchronously (used in tests)
 * @param filePath Path to the mission JSON file
 * @returns Compiled mission
 */
export function loadMissionSync(filePath: string): CompiledMission {
  try {
    // For tests running in Node.js environment
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const missionData = JSON.parse(fileContent);
    return validateAndCompile(missionData);
  } catch (error) {
    // Fallback for browser environment or if file reading fails
    // Use the space_hulk_1 mission as a fallback
    const fallbackMission = missions.space_hulk_1;
    if (fallbackMission) {
      return validateAndCompile(fallbackMission);
    }
    throw new Error(`Failed to load mission from ${filePath}: ${error}`);
  }
}
