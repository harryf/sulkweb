import { PieceEvents } from '@sulk/engine/index.js';
import { groupBySquad, type RosterEntry } from './marineNames.js';
import { KEY_ROWS, SPECIAL_KEYS, KEY_NOTES } from './keyboardHelp.js';
import { FACING_ARROWS } from '../config.js';

/** Live stats for one marine, read from the engine by the owner (GameScene). */
export interface PieceStats {
  alive: boolean;
  apRemaining: number;
  apInitial: number;
  /** Present only for limited-ammo weapons (flamer / assault cannon). */
  ammo?: number;
  overwatch: boolean;
  jammed: boolean;
  /** Board facing 0-3 (up/right/down/left) — rendered as the card's arrow. */
  facing: number;
}


/**
 * DOM roster panel to the right of the canvas: one row per squad, one card per
 * marine (icon, name, AP, ammo, weapon, state badges). Cards grey out on death
 * and mark ESCAPED marines; clicking a living marine's card selects him on the
 * map. Selection state stays in sync via the `selected` PieceEvents channel.
 *
 * Truthfulness split vs HudPanel: the HUD is strictly event-payload-driven so
 * stealer-phase REPLAY shows historical values. The roster's state
 * TRANSITIONS (death, escape, badges) are payload-driven too, but its AP/ammo
 * numbers pull live engine state via `readStats` — during a replay a card can
 * briefly show final-phase numbers, which is acceptable for a squad overview,
 * and `refreshAll()` (called by GameScene.finishReplay) reconciles everything
 * to engine truth the moment the replay ends.
 */
export class RosterPanel {
  readonly root: HTMLElement;
  private cards = new Map<string, HTMLElement>();
  private byId = new Map<string, RosterEntry>();
  /** Team command-point pool (shared) — shown on every living card. */
  private cp = 0;

  constructor(
    entries: RosterEntry[],
    private readStats: (id: string) => PieceStats | undefined,
    onSelect: (id: string) => void,
    parent: HTMLElement = document.body,
    iconUrl: (spriteKey: string) => string = k => `assets/themes/default/${k}.png`,
  ) {
    this.root = document.createElement('aside');
    this.root.id = 'roster-panel';
    const title = document.createElement('h2');
    title.textContent = 'Marine Roster';
    this.root.appendChild(title);

    for (const row of groupBySquad(entries)) {
      const section = document.createElement('section');
      section.className = 'squad-row';
      section.dataset.squad = row.squad;
      const h = document.createElement('h3');
      h.textContent = row.title;
      section.appendChild(h);
      const cards = document.createElement('div');
      cards.className = 'cards';
      for (const e of row.members) {
        this.byId.set(e.id, e);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'marine-card';
        card.dataset.pieceId = e.id;
        card.innerHTML =
          `<span class="m-face"></span>` +
          `<img alt="" src="${iconUrl(e.spriteKey)}">` +
          `<span class="m-name">${e.name}</span>` +
          (e.special ? `<span class="m-weapon">${e.special}</span>` : '') +
          `<span class="m-stats"></span>` +
          `<span class="m-ammo"></span>` +
          `<span class="m-badges"></span>` +
          `<span class="m-state"></span>`;
        card.addEventListener('click', () => {
          if (card.classList.contains('dead') || card.classList.contains('escaped')) return;
          onSelect(e.id);
        });
        cards.appendChild(card);
        this.cards.set(e.id, card);
      }
      section.appendChild(cards);
      this.root.appendChild(section);
    }
    this.root.appendChild(buildKeyboardHelp());
    this.root.appendChild(buildCredits());
    parent.appendChild(this.root);
    this.refreshAll();

    // Event-driven updates — payloads only; full truth re-read on refreshAll().
    PieceEvents.on('cpChanged', ({ cp }) => { this.cp = cp; this.refreshAll(); });
    PieceEvents.on('pieceMoved', ({ pieceId }) => this.refreshCard(pieceId)); // turns update the facing arrow
    PieceEvents.on('apChanged', ({ pieceId }) => this.refreshCard(pieceId));
    PieceEvents.on('ammoChanged', ({ pieceId }) => this.refreshCard(pieceId));
    PieceEvents.on('jammed', ({ pieceId }) => this.refreshCard(pieceId));
    PieceEvents.on('overwatchChanged', ({ pieceId }) => this.refreshCard(pieceId));
    PieceEvents.on('pieceDied', ({ pieceId }) => this.markState(pieceId, 'dead', 'KIA'));
    PieceEvents.on('marineEscaped', ({ pieceId }) => this.markState(pieceId, 'escaped', 'ESCAPED'));
    PieceEvents.on('catPickedUp', ({ carrierId }) => this.setCatCarrier(carrierId));
    PieceEvents.on('catDropped', () => this.setCatCarrier(null));
    PieceEvents.on('selected', ({ pieceId }) => this.highlight(pieceId));
  }

  /** Re-read every living card's stats from the engine (post-replay truth). */
  refreshAll(): void {
    for (const id of this.cards.keys()) this.refreshCard(id);
  }

  private refreshCard(id: string): void {
    const card = this.cards.get(id);
    if (!card || card.classList.contains('dead') || card.classList.contains('escaped')) return;
    const s = this.readStats(id);
    if (!s) return;
    if (!s.alive) { this.markState(id, 'dead', 'KIA'); return; }
    card.querySelector('.m-face')!.textContent = FACING_ARROWS[s.facing] ?? '';
    card.querySelector('.m-stats')!.textContent = `AP ${s.apRemaining}/${s.apInitial} · CP ${this.cp}`;
    card.querySelector('.m-ammo')!.textContent = s.ammo !== undefined ? `Ammo ${s.ammo}` : '';
    const badges: string[] = [];
    if (s.overwatch) badges.push('OW');
    if (s.jammed) badges.push('JAM');
    if (card.classList.contains('has-cat')) badges.push('C.A.T.');
    card.querySelector('.m-badges')!.textContent = badges.join(' · ');
  }

  private markState(id: string, cls: 'dead' | 'escaped', label: string): void {
    const card = this.cards.get(id);
    if (!card || card.classList.contains(cls)) return;
    card.classList.add(cls);
    card.classList.remove('selected');
    card.querySelector('.m-state')!.textContent = label;
    card.querySelector('.m-badges')!.textContent = '';
    card.querySelector('.m-face')!.textContent = '';
  }

  private setCatCarrier(id: string | null): void {
    for (const [cid, card] of this.cards) {
      card.classList.toggle('has-cat', cid === id);
      this.refreshCard(cid);
    }
  }

  private highlight(id: string | null): void {
    for (const [cid, card] of this.cards) {
      const on = cid === id && !card.classList.contains('dead');
      card.classList.toggle('selected', on);
      if (on) card.scrollIntoView?.({ block: 'nearest' }); // panel can overflow — keep the highlight visible (absent in jsdom)
    }
  }
}

/**
 * Collapsible keyboard help: keycap squares drawn in physical QWERTY rows
 * (native <details> supplies the expand/collapse arrow).
 */
function buildKeyboardHelp(): HTMLElement {
  const details = document.createElement('details');
  details.className = 'kb-help';
  details.open = true;
  const summary = document.createElement('summary');
  summary.textContent = 'Keyboard controls';
  // A focused <summary> re-toggles on Enter/Space — which are gameplay keys
  // (Enter ends the turn). Drop focus once toggled so play continues cleanly.
  details.addEventListener('toggle', () => summary.blur());
  details.appendChild(summary);

  const board = document.createElement('div');
  board.className = 'kb-board';
  for (const row of KEY_ROWS) {
    const rowEl = document.createElement('div');
    rowEl.className = 'kb-row';
    rowEl.style.paddingLeft = `${row.offset * 40}px`;
    for (const cap of row.caps) {
      const capEl = document.createElement('span');
      capEl.className = cap.label ? 'keycap' : 'keycap unbound';
      capEl.innerHTML = `<kbd>${cap.key}</kbd>` + (cap.label ? `<i>${cap.label}</i>` : '');
      if (!cap.label) capEl.setAttribute('aria-hidden', 'true'); // spacer, not content
      rowEl.appendChild(capEl);
    }
    board.appendChild(rowEl);
  }
  const special = document.createElement('div');
  special.className = 'kb-row kb-special';
  for (const cap of SPECIAL_KEYS) {
    const capEl = document.createElement('span');
    capEl.className = 'keycap wide';
    capEl.innerHTML = `<kbd>${cap.key}</kbd><i>${cap.label}</i>`;
    special.appendChild(capEl);
  }
  board.appendChild(special);
  details.appendChild(board);

  const notes = document.createElement('ul');
  notes.className = 'kb-notes';
  for (const note of KEY_NOTES) {
    const li = document.createElement('li');
    li.textContent = note;
    notes.appendChild(li);
  }
  details.appendChild(notes);
  return details;
}

/** Credits: Sulk, music, Space Hulk inspiration, and the legal text. */
function buildCredits(): HTMLElement {
  const section = document.createElement('section');
  section.className = 'credits';
  section.innerHTML =
    `<h3>Credits</h3>` +
    `<p>A browser recreation of <a href="https://sulk.sourceforge.net/" target="_blank" rel="noopener">Sulk</a> ` +
    `by Toby Woodwark. Sulk and its graphics are copyright 2002-3 Toby Woodwark, ` +
    `distributed under the GNU General Public License.</p>` +
    `<p class="audio-credit">Ambient music: <a href="https://www.youtube.com/@Musicof40K" target="_blank" rel="noopener">Music of 40K</a>, ` +
    `used with credit under the channel's non-profit terms. Sound effects from the original Sulk sound set. M mutes sound.</p>` +
    `<p>Inspired by Space Hulk&trade;, first edition. Space Hulk is a board game published by Games Workshop&trade;.</p>` +
    `<details class="legal"><summary>Legal</summary>` +
    `<p>This game and this page are completely unofficial and in no way endorsed by Games Workshop Limited.</p>` +
    `<p>Adeptus Astartes, Black Templars, Blood Angels, Catachan Jungle Fighters, Chaos Space Marines, the Chaos device, ` +
    `Dark Eldar, Dark Angels, the Double-Headed/Imperial Eagle device, Eldar, Eldar symbol devices, Genestealers, ` +
    `the Games Workshop logo, Games Workshop, Inquisitor, the Inquisitor device, Khorne, Kroot, Leman Russ, Necron, ` +
    `Nurgle, Slaanesh, Space Marine, Space Marine chapter logos, Space Wolves, Sisters of Battle, Space Hulk, ` +
    `Steel Legion, Tau, the Tau caste designations, Terminators, Tyranid, Tyrannid, Tzeentch, Ultramarines, Warhammer, ` +
    `Warhammer 40k Device, White Scars, and all associated marks, names, characters, illustrations and images from the ` +
    `Space Hulk games and Warhammer 40,000 universes are either &reg;, &trade; and/or &copy; Games Workshop Ltd 2000-2003, ` +
    `variably registered in the UK and other countries around the world. Used without permission. ` +
    `No challenge to their status intended. All Rights Reserved.</p>` +
    `</details>`;
  return section;
}
