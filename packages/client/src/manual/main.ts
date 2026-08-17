import './manual.css';
import { missions } from '@sulk/engine/index.js';
import type { CompiledMission } from '@sulk/engine/index.js';
import { SECTIONS, QUOTES, CONTROLS_INTRO } from './content.js';
import { missionMapSVG, MAP_LEGEND } from './missionMapSVG.js';
import { PLAYABLE_MISSIONS } from '../ui/missionMeta.js';
import { KEY_ROWS, SPECIAL_KEYS, KEY_NOTES } from '../ui/keyboardHelp.js';

/**
 * The field manual: a static page assembled from the same modules the game
 * runs on — mission maps render from the engine's own mission JSON, the key
 * chart from the game's keyboard layout data. Nothing here can drift from
 * the game without failing to compile.
 */

/** Player-facing victory/defeat line per mission (see docs/rules-reference.md). */
const OBJECTIVE_NOTES: Record<string, string> = {
  debug_1: 'Kill everything, or reach the exit.',
  space_hulk_1: 'Flame the Launch Control square. You lose the moment no living flamer has ammo.',
  space_hulk_2: 'Kill 30 (blips count their hidden value), or blockade every entry point.',
  space_hulk_3: 'Carry the C.A.T. out through an exit. Damaged = draw; destroyed = defeat.',
  space_hulk_4: 'Burn both Gene Banks. You lose the moment no living flamer has ammo.',
  space_hulk_5: 'Get 5 marines out through the exits. Fewer than 5 alive-plus-escaped = defeat.',
  space_hulk_6: 'Survive to the end of turn 16. Lost ducting or a flamed control room = defeat.',
  beta_1: 'Get any one marine out through the far exit.',
  beta_2: 'Hold the Data Room with a sergeant for 4 quiet end phases. Both sergeants dead = defeat.',
};

const root = document.getElementById('manual')!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

// ---- Header ----
const header = el('header', 'manual-header');
header.appendChild(el('h1', undefined, 'SULK'));
header.appendChild(el('p', 'manual-subtitle', 'Field manual: everything the ship will not tell you'));
const back = el('a', 'back-link', '&larr; Back to the game');
(back as HTMLAnchorElement).href = './';
(back as HTMLAnchorElement).id = 'back-to-game';
header.appendChild(back);
root.appendChild(header);

// ---- Table of contents ----
const toc = el('nav', 'manual-toc');
const tocList = el('ul');
for (const s of SECTIONS) {
  tocList.appendChild(el('li', undefined, `<a href="#${s.id}">${s.title}</a>`));
}
tocList.appendChild(el('li', undefined, '<a href="#controls">Controls</a>'));
tocList.appendChild(el('li', undefined, '<a href="#missions">The missions</a>'));
toc.appendChild(tocList);
root.appendChild(toc);

// ---- Rule sections, with the squad's testimony interleaved ----
/** Section ids after which a quote lands (spread through the document). */
const QUOTE_AFTER = ['what-is-this', 'ap-cp', 'shooting', 'flamer', 'doors', 'flames'];
let quoteIdx = 0;

for (const s of SECTIONS) {
  const section = el('section');
  section.id = s.id;
  section.appendChild(el('h2', undefined, s.title));
  section.insertAdjacentHTML('beforeend', s.html);
  root.appendChild(section);

  if (QUOTE_AFTER.includes(s.id) && quoteIdx < QUOTES.length) {
    const q = QUOTES[quoteIdx++];
    const quote = el('blockquote', 'marine-quote');
    quote.appendChild(el('p', undefined, `&ldquo;${q.text}&rdquo;`));
    quote.appendChild(el('footer', undefined, `&mdash; ${q.attribution}`));
    root.appendChild(quote);
  }
}

// ---- Controls ----
const controls = el('section');
controls.id = 'controls';
controls.appendChild(el('h2', undefined, 'Controls'));
controls.insertAdjacentHTML('beforeend', CONTROLS_INTRO);
const rose = el('div', 'key-rose');
for (const row of KEY_ROWS) {
  const rowEl = el('div', 'key-row');
  rowEl.style.paddingLeft = `${row.offset * 3}em`;
  for (const cap of row.caps) {
    const capEl = el('div', cap.label ? 'keycap' : 'keycap unbound');
    capEl.appendChild(el('span', 'key-letter', cap.key));
    capEl.appendChild(el('span', 'key-label', cap.label ?? ''));
    rowEl.appendChild(capEl);
  }
  rose.appendChild(rowEl);
}
const specials = el('div', 'key-row specials');
for (const cap of SPECIAL_KEYS) {
  const capEl = el('div', 'keycap wide');
  capEl.appendChild(el('span', 'key-letter', cap.key));
  capEl.appendChild(el('span', 'key-label', cap.label ?? ''));
  specials.appendChild(capEl);
}
rose.appendChild(specials);
controls.appendChild(rose);
const notes = el('ul', 'key-notes');
for (const n of KEY_NOTES) notes.appendChild(el('li', undefined, n));
controls.appendChild(notes);
root.appendChild(controls);

// ---- The missions: maps drawn live from the mission JSON ----
const missionsSection = el('section');
missionsSection.id = 'missions';
missionsSection.appendChild(el('h2', undefined, 'The missions'));
missionsSection.appendChild(el('p', undefined,
  'Every map below is drawn from the same mission data the game plays: squares, doors, '
  + 'entry points, and objectives exactly where you will find them.'));

const legend = el('div', 'map-legend');
legend.id = 'map-legend';
for (const item of MAP_LEGEND) {
  const row = el('span', 'legend-item');
  row.insertAdjacentHTML('beforeend', item.swatch);
  row.appendChild(el('span', undefined, item.label));
  legend.appendChild(row);
}
missionsSection.appendChild(legend);

interface ManualMission { key: string; name: string; tagline: string; squad: string }
const MANUAL_MISSIONS: ManualMission[] = [
  ...PLAYABLE_MISSIONS,
  {
    key: 'debug_1',
    name: missions.debug_1.name,
    tagline: 'The training scenario: one marine, a trickle of blips. Not on the mission select; start it with ?mission=debug_1.',
    squad: '1 storm bolter',
  },
];

for (const m of MANUAL_MISSIONS) {
  const article = el('article', 'mission-entry');
  article.id = `mission-${m.key}`;
  article.appendChild(el('h3', undefined, m.name));
  article.appendChild(el('p', 'mission-tagline', m.tagline));
  const facts = el('ul', 'mission-facts');
  facts.appendChild(el('li', undefined, `<strong>Objective:</strong> ${OBJECTIVE_NOTES[m.key] ?? ''}`));
  facts.appendChild(el('li', undefined, `<strong>Squad:</strong> ${m.squad}`));
  article.appendChild(facts);
  const map = el('div', 'mission-map');
  map.innerHTML = missionMapSVG(missions[m.key as keyof typeof missions] as CompiledMission);
  article.appendChild(map);
  missionsSection.appendChild(article);
}
root.appendChild(missionsSection);

// ---- Footer ----
const footer = el('footer', 'manual-footer',
  'A fan recreation of Toby Woodwark&rsquo;s <em>Sulk</em> (2003) &middot; '
  + '<a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0</a> &middot; '
  + 'Space Hulk is a trademark of Games Workshop; this project is unaffiliated '
  + 'and claims no rights over Games Workshop&rsquo;s intellectual property.');
root.appendChild(footer);
