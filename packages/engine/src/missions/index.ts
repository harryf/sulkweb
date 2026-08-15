// Mission registry — folder structure mirrors the original game's
// data/missions/<family>/MISH_<family>_<n>.py layout.
import space_hulk_1 from './space_hulk/space_hulk_1.json' with { type: 'json' };
import space_hulk_2 from './space_hulk/space_hulk_2.json' with { type: 'json' };
import debug_1 from './debug/debug_1.json' with { type: 'json' };

export const missions = {
  space_hulk_1,
  space_hulk_2,
  debug_1,
};
