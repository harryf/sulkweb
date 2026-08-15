import { PieceEvents } from '@sulk/engine/index.js';
import { groupBySquad, type RosterEntry } from './marineNames.js';

/** Live stats for one marine, read from the engine by the owner (GameScene). */
export interface PieceStats {
  alive: boolean;
  apRemaining: number;
  apInitial: number;
  /** Present only for limited-ammo weapons (flamer / assault cannon). */
  ammo?: number;
  overwatch: boolean;
  jammed: boolean;
}

/**
 * DOM roster panel to the right of the canvas: one row per squad, one card per
 * marine (icon, name, AP, ammo, weapon, state badges). Cards grey out on death
 * and mark ESCAPED marines; clicking a living marine's card selects him on the
 * map. Selection state stays in sync via the `selected` PieceEvents channel.
 */
export class RosterPanel {
  readonly root: HTMLElement;
  private cards = new Map<string, HTMLElement>();
  private byId = new Map<string, RosterEntry>();

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
    title.textContent = 'Strike Force';
    this.root.appendChild(title);

    for (const row of groupBySquad(entries)) {
      const section = document.createElement('section');
      section.className = 'squad-row';
      section.dataset.squad = row.squad;
      const h = document.createElement('h3');
      h.textContent = `Squad ${row.squad}`;
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
          `<img alt="" src="${iconUrl(e.spriteKey)}">` +
          `<span class="m-name">${e.name}</span>` +
          (e.special ? `<span class="m-weapon">${e.special}</span>` : '') +
          `<span class="m-stats"></span>` +
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
    parent.appendChild(this.root);
    this.refreshAll();

    // Event-driven updates — payloads only; full truth re-read on refreshAll().
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
    card.querySelector('.m-stats')!.textContent =
      `AP ${s.apRemaining}/${s.apInitial}` + (s.ammo !== undefined ? ` · Ammo ${s.ammo}` : '');
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
  }

  private setCatCarrier(id: string | null): void {
    for (const [cid, card] of this.cards) {
      card.classList.toggle('has-cat', cid === id);
      this.refreshCard(cid);
    }
  }

  private highlight(id: string | null): void {
    for (const [cid, card] of this.cards) {
      card.classList.toggle('selected', cid === id && !card.classList.contains('dead'));
    }
  }
}
