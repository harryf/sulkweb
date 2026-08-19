/**
 * Keyboard-help layout data: keycaps in physical QWERTY rows so the help can
 * draw squares where the keys actually sit. Unbound keys render as dimmed
 * placeholders to keep the spatial relationships honest (Q-W-E over A-D
 * over Z-X-C is the movement circle, with S as the door key at its centre).
 */

export interface KeyCap {
  key: string;
  /** Action label. Absent = unbound placeholder, drawn dimmed. */
  label?: string;
  /** Weapon qualifier drawn in brackets under the label ("assault cannon"). */
  sub?: string;
  /** Marine type that must be in the mission for the key to do anything —
   *  the in-game help dims the cap when no such marine is deployed. */
  requires?: 'assault_cannon' | 'chain_fist' | 'heavy_flamer';
}

export interface KeyRow {
  /** Left offset in key-widths, matching the physical row stagger. */
  offset: number;
  caps: KeyCap[];
}

export const KEY_ROWS: KeyRow[] = [
  {
    offset: 0,
    caps: [
      { key: 'Q', label: 'fwd left' },
      { key: 'W', label: 'forward' },
      { key: 'E', label: 'fwd right' },
      { key: 'R', label: 'reload', sub: 'assault cannon', requires: 'assault_cannon' },
      { key: 'T', label: 'autofire', sub: 'assault cannon', requires: 'assault_cannon' },
      { key: 'Y' },
      { key: 'U', label: 'unjam' },
      { key: 'I' },
      { key: 'O', label: 'overwatch' },
      { key: 'P', label: 'spend CP' },
    ],
  },
  {
    offset: 0.35,
    caps: [
      { key: 'A', label: 'turn left' },
      { key: 'S', label: 'open door' },
      { key: 'D', label: 'turn right' },
      { key: 'F', label: 'fire' },
      { key: 'G', label: 'cut door', sub: 'chain fist', requires: 'chain_fist' },
      { key: 'H', label: 'door' },
      { key: 'J' },
      { key: 'K', label: 'mute' },
      { key: 'L', label: 'show LOS' },
    ],
  },
  {
    offset: 0.75,
    caps: [
      { key: 'Z', label: 'back left' },
      { key: 'X', label: 'back' },
      { key: 'C', label: 'back right' },
      { key: 'V' },
      { key: 'B', label: 'blow up', sub: 'heavy flamer', requires: 'heavy_flamer' },
      { key: 'N' },
      { key: 'M', label: 'melee' },
    ],
  },
];

/** Keys outside the letter block. */
export const SPECIAL_KEYS: KeyCap[] = [
  { key: '1-0', label: 'select marine' },
  { key: 'Enter', label: 'end turn' },
  { key: 'Esc', label: 'pause' },
];

/** Usage notes that need more room than a keycap label. */
export const KEY_NOTES: string[] = [
  'Deployment: click an X square to place a marine (or click his card first to pick him), click a placed marine to lift him again, A/D spins him for free. AUTO DEPLOY fills the line; DONE or the clock starts the mission.',
  'Click a marine or his card to select him, or press his number: 1-5 the first squad, 6-0 the second, shown as [n] on his card. Fallen marines lose their key.',
  'Click the mini-map to swing the view there. Its radar pulses from your sergeant: solid returns are stealers, faint smears are blips. No sergeant, no radar.',
  'F shoots the hovered door, else the nearest enemy, else the nearest closed door in arc. The red reticle marks the target F will hit.',
  'Flamer: F aims at the hovered square, F again fires, any other key cancels.',
  'B twice within 2.5 seconds self-destructs the flamer.',
  'R reloads and T autofires the assault cannon. G is the chain fist door cut.',
];
