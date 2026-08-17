import '../manual/manual.css';
import './credits.css';
import { MUSIC_TRACKS, SFX_SOURCES, musicUrl } from '../audio/audioManifest.js';
import { ALIEN_SEGMENTS } from '../audio/alienSegments.js';
import { PLAYABLE_MISSIONS } from '../ui/missionMeta.js';

/**
 * The audio credits page: every sound the game ships, where it came from,
 * and a link to the original video. Generated from the SAME manifest that
 * fetchAudio.ts downloads from and the game plays from (audioManifest.ts,
 * alienSegments.ts), so an entry can never ship without its attribution.
 */

const root = document.getElementById('credits')!;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

const MISSION_NAMES: Record<string, string> = Object.fromEntries(
  PLAYABLE_MISSIONS.map(m => [m.key, m.name]),
);
MISSION_NAMES.debug_1 = 'Training (debug_1)';

// ---- Header ----
const header = el('header', 'manual-header');
header.appendChild(el('h1', undefined, 'SULK'));
header.appendChild(el('p', 'manual-subtitle', 'Audio credits: every sound, its source, and where to hear the original'));
const back = el('a', 'back-link', '&larr; Back to the game');
back.href = './';
back.id = 'back-to-game';
header.appendChild(back);
root.appendChild(header);

// ---- Intro ----
root.appendChild(el('p', undefined,
  'Sulk is a free, non-profit fan game. The atmosphere below is borrowed, with '
  + 'gratitude and full attribution: every track and effect links the original '
  + 'video it came from. If you like what you hear, click through and support '
  + 'the channels and the artists behind the originals.'));

// ---- Ambient mission music ----
root.appendChild(el('h2', undefined, 'Ambient mission music'));
root.appendChild(el('p', undefined,
  'Each mission is scored by a soundscape from the '
  + '<a href="https://www.youtube.com/@Musicof40K">Music of 40K</a> channel ('
  + '<a href="https://www.youtube.com/playlist?list=PLyLLeKcxw24V5T-4J8D5KEXpvbTVIRwoh">Space Hulk Ambient Music playlist</a>), '
  + 'used under the channel’s stated non-profit terms:'));
root.appendChild(el('blockquote', 'terms-quote',
  '“You can use my soundscapes for non-profit projects… just be sure to credit '
  + 'Music of 40K and include a link to the soundscape you used.”'));
root.appendChild(el('p', undefined,
  'The channel curates existing work; the underlying music belongs to its '
  + 'composers and publishers, credited per track below.'));

const musicTable = el('table', 'credits-table');
musicTable.id = 'music-credits';
musicTable.appendChild(el('thead', undefined,
  '<tr><th>Mission</th><th>Soundscape</th><th>Original work</th><th>Composer / artist</th></tr>'));
const musicBody = el('tbody');
for (const t of MUSIC_TRACKS) {
  musicBody.appendChild(el('tr', 'music-row',
    `<td>${MISSION_NAMES[t.mission] ?? t.mission}</td>`
    + `<td><a href="${musicUrl(t.videoId)}">${t.title}</a></td>`
    + `<td>${t.album}</td>`
    + `<td>${t.artist}</td>`));
}
musicTable.appendChild(musicBody);
root.appendChild(musicTable);

// ---- Sound effects ----
root.appendChild(el('h2', undefined, 'Sound effects'));
root.appendChild(el('p', undefined,
  'The marines speak with the <strong>original Sulk 0.29 sound set</strong> '
  + '(bolter, flamer, assault cannon, close combat, movement, jams, doors, the '
  + 'death scream, the self-destruct), committed in this repository and public '
  + 'domain per the original game’s SOUNDS_INFO.'));

const inGameAlienCuts = ALIEN_SEGMENTS.filter(s => s.role !== 'unused' && s.role !== 'ambience').length;
const sfxList = el('ul', 'sfx-list');
sfxList.id = 'sfx-credits';
for (const s of SFX_SOURCES) {
  const extra = s.id === 'alien'
    ? ` (${inGameAlienCuts} short cuts, segmented and classified in <code>alienSegments.ts</code>)`
    : '';
  sfxList.appendChild(el('li', 'sfx-row',
    `${s.what}${extra}: cut from `
    + `<a href="${musicUrl(s.videoId)}">youtube.com/watch?v=${s.videoId}</a>, `
    + `uploaded by ${s.uploader}.`));
}
root.appendChild(sfxList);

// ---- Takedown note ----
root.appendChild(el('div', 'takedown',
  '<strong>Rights holders:</strong> this is a non-commercial fan project. If '
  + 'you own any of the audio above and would like it credited differently or '
  + 'removed, <a href="https://github.com/harryf/sulkweb/issues">open an issue</a> '
  + 'and it will be resolved promptly.'));

// ---- Footer ----
root.appendChild(el('footer', 'manual-footer',
  'A fan recreation of Toby Woodwark&rsquo;s <em>Sulk</em> (2003) &middot; '
  + '<a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0</a> (code; audio '
  + 'credited above is not GPL) &middot; Space Hulk is a trademark of Games '
  + 'Workshop; this project is unaffiliated. '
  + `&middot; <span id="app-version">${__APP_VERSION__}</span>`));
