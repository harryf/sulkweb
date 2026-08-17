import { PLAYABLE_MISSIONS } from './missionMeta.js';

/**
 * The landing screen: a semi-transparent DOM overlay above the attract-mode
 * board (space_hulk_1 plays no part underneath — input is disabled — it is
 * scenery). Title, intro, mission list, manual link, credits.
 *
 * Pure DOM so the mission list scrolls natively, links are real links, and
 * Playwright can probe everything without canvas OCR.
 */
export function showHomeOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = 'home-overlay';

  const panel = document.createElement('div');
  panel.className = 'home-panel';
  overlay.appendChild(panel);

  const title = document.createElement('h1');
  title.className = 'home-title';
  title.textContent = 'SULK';
  panel.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'home-subtitle';
  subtitle.textContent = 'A Space Hulk for your browser';
  panel.appendChild(subtitle);

  const intro = document.createElement('p');
  intro.className = 'home-intro';
  intro.textContent =
    'Lead a squad of Terminator marines through the corridors of a derelict ship '
    + 'crawling with genestealers. Every marine action costs action points, the clock '
    + 'is always running, and the blips on your scanner are always closing. '
    + 'Complete the mission objective before the swarm completes you.';
  panel.appendChild(intro);

  const manualRow = document.createElement('p');
  manualRow.className = 'home-manual-row';
  const manualLink = document.createElement('a');
  manualLink.id = 'manual-link';
  manualLink.href = 'manual.html';
  manualLink.textContent = 'Read the field manual';
  manualRow.appendChild(manualLink);
  manualRow.appendChild(document.createTextNode(': rules, controls, and maps of every mission.'));
  panel.appendChild(manualRow);

  const listHeading = document.createElement('h2');
  listHeading.className = 'home-missions-heading';
  listHeading.textContent = 'Select mission';
  panel.appendChild(listHeading);

  const list = document.createElement('div');
  list.className = 'home-mission-list';
  for (const m of PLAYABLE_MISSIONS) {
    const entry = document.createElement('a');
    entry.className = 'home-mission';
    entry.href = `?mission=${m.key}`;
    entry.dataset.mission = m.key;

    const name = document.createElement('span');
    name.className = 'home-mission-name';
    name.textContent = m.name;
    entry.appendChild(name);

    const tag = document.createElement('span');
    tag.className = 'home-mission-tagline';
    tag.textContent = m.tagline;
    entry.appendChild(tag);

    list.appendChild(entry);
  }
  panel.appendChild(list);

  const credits = document.createElement('p');
  credits.className = 'home-credits';
  credits.innerHTML =
    'A fan recreation of Toby Woodwark’s <em>Sulk</em> (2003) · '
    + '<a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0</a> · '
    + 'ambient music courtesy of <a href="https://www.youtube.com/@Musicof40K">Music of 40K</a> · '
    + 'Space Hulk is a trademark of Games Workshop; this project is unaffiliated.';
  panel.appendChild(credits);

  document.body.appendChild(overlay);
  return overlay;
}
