// Mission registry — folder structure mirrors the original game's
// data/missions/<family>/MISH_<family>_<n>.py layout.
import space_hulk_1 from './space_hulk/space_hulk_1.json' with { type: 'json' };
import space_hulk_2 from './space_hulk/space_hulk_2.json' with { type: 'json' };
import space_hulk_3 from './space_hulk/space_hulk_3.json' with { type: 'json' };
import space_hulk_4 from './space_hulk/space_hulk_4.json' with { type: 'json' };
import space_hulk_5 from './space_hulk/space_hulk_5.json' with { type: 'json' };
import space_hulk_6 from './space_hulk/space_hulk_6.json' with { type: 'json' };
import beta_1 from './beta/beta_1.json' with { type: 'json' };
import debug_1 from './debug/debug_1.json' with { type: 'json' };

export const missions = {
  space_hulk_1,
  space_hulk_2,
  space_hulk_3,
  space_hulk_4,
  space_hulk_5,
  space_hulk_6,
  beta_1,
  debug_1,
};
