import type { missions } from '@sulk/engine/index.js';

/** One playable entry on the landing screen / manual mission list. */
export interface MissionMeta {
  key: keyof typeof missions;
  /** Display title (mission JSON `name`). */
  name: string;
  /** One-line player-facing hook, grounded in docs/rules-reference.md. */
  tagline: string;
  /** Squad summary for the manual's mission section. */
  squad: string;
}

/**
 * The missions offered to the player, in campaign order. debug_1 stays
 * reachable via ?mission=debug_1 but is a training/debug scenario, not a
 * player mission, so it is deliberately absent here.
 */
export const PLAYABLE_MISSIONS: MissionMeta[] = [
  {
    key: 'space_hulk_1',
    name: 'Suicide Mission',
    tagline: 'Burn the Launch Control room before your flamer runs dry: six shots are the mission clock.',
    squad: '3 storm bolters, sergeant, heavy flamer',
  },
  {
    key: 'space_hulk_2',
    name: 'Exterminate',
    tagline: 'Thirty confirmed kills, or a marine blockading every entry point. Squad Constantine starts scattered.',
    squad: '3 storm bolters, sergeant, heavy flamer',
  },
  {
    key: 'space_hulk_3',
    name: 'Rescue',
    tagline: 'Recover the C.A.T. recorder and carry it out intact. Three fresh blips every turn.',
    squad: '6 storm bolters, 2 sergeants, 2 heavy flamers',
  },
  {
    key: 'space_hulk_4',
    name: 'Cleanse and Burn',
    tagline: 'Two Gene Banks must burn. Your flamers carry the mission’s entire ammunition.',
    squad: '6 storm bolters, 2 sergeants, 2 heavy flamers',
  },
  {
    key: 'space_hulk_5',
    name: 'Decoy',
    tagline: 'Get five of your ten marines to the exit. Every loss cuts the margin.',
    squad: '6 storm bolters, 2 sergeants, 2 heavy flamers',
  },
  {
    key: 'space_hulk_6',
    name: 'Defend',
    tagline: 'Hold the ducting and the control room until the end of turn 16. Flamers cut to four shots.',
    squad: '6 storm bolters, 2 sergeants, 2 heavy flamers',
  },
  {
    key: 'beta_1',
    name: 'Messenger',
    tagline: 'One marine out through the far exit. Any marine will do.',
    squad: '3 storm bolters, sergeant, heavy flamer',
  },
  {
    key: 'beta_2',
    name: 'Download',
    tagline: 'Hold the Data Room with a sergeant for four quiet turns. The full armoury, and decoys in the dark.',
    squad: '5 storm bolters, sergeant, power-sword sergeant, assault cannon, chain fist, heavy flamer',
  },
];
