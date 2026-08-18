/**
 * Keyboard-help layout data: keycaps in physical QWERTY rows so the help can
 * draw squares where the keys actually sit. Unbound keys render as dimmed
 * placeholders to keep the spatial relationships honest (Q-W-E over A-S-D
 * over Z-X-C is the movement rose).
 */

export interface KeyCap {
  key: string;
  /** Action label. Absent = unbound placeholder, drawn dimmed. */
  label?: string;
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
      { key: 'R', label: 'reload' },
      { key: 'T', label: 'autofire' },
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
      { key: 'S', label: 'back' },
      { key: 'D', label: 'turn right' },
      { key: 'F', label: 'fire' },
      { key: 'G', label: 'cut door' },
      { key: 'H', label: 'door' },
      { key: 'J' },
      { key: 'K' },
      { key: 'L', label: 'show LOS' },
    ],
  },
  {
    offset: 0.75,
    caps: [
      { key: 'Z', label: 'back right' },
      { key: 'X', label: 'melee' },
      { key: 'C', label: 'back left' },
      { key: 'V' },
      { key: 'B', label: 'blow up' },
      { key: 'N' },
      { key: 'M', label: 'mute' },
    ],
  },
];

/** Keys outside the letter block. */
export const SPECIAL_KEYS: KeyCap[] = [
  { key: 'Enter', label: 'end turn' },
  { key: 'Esc', label: 'pause' },
];

/** Usage notes that need more room than a keycap label. */
export const KEY_NOTES: string[] = [
  'Click a marine or his card to select him.',
  'F shoots the hovered door, else the nearest enemy, else the nearest closed door in arc — the red reticle marks the door F will hit.',
  'Flamer: F aims at the hovered square, F again fires, any other key cancels.',
  'B twice within 2.5 seconds self-destructs the flamer.',
  'R reloads and T autofires the assault cannon. G is the chain fist door cut.',
];
