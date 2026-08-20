import type { GameLogger } from '@sulk/engine/index.js';

/**
 * End-of-mission DOM dialog, shown by GameScene's gameOver handler on top of
 * the in-canvas MISSION COMPLETE / FAILED banner. Offers a retry (full reload
 * — same mission, same URL, so a pinned ?seed replays the identical game) and
 * a return to the mission-select homepage (the bare path, no query).
 *
 * When a GameLogger is passed it also offers the gameplay-log export: a
 * debrief-notes textarea and a download button that saves the full event
 * record as JSON (see docs/gamelog-format.md). The corpus of downloaded logs
 * is the raw material for mission-generic stealer-AI analysis.
 */
export function showEndDialog(result: string, gameLog?: GameLogger | null): HTMLElement {
  const existing = document.getElementById('end-dialog');
  if (existing) return existing; // gameOver fires once, but stay idempotent

  const dialog = document.createElement('div');
  dialog.id = 'end-dialog';
  dialog.dataset.result = result;

  const box = document.createElement('div');
  box.className = 'end-box ' + (result === 'win' ? 'end-win' : result === 'draw' ? 'end-draw' : 'end-loss');
  dialog.appendChild(box);

  const heading = document.createElement('h2');
  heading.textContent = result === 'win' ? 'Mission complete'
    : result === 'draw' ? 'Mission drawn' : 'Mission failed';
  box.appendChild(heading);

  const blurb = document.createElement('p');
  blurb.textContent = result === 'win'
    ? 'The Chapter will remember this day.'
    : result === 'draw'
      ? 'A costly bargain. The hulk keeps its secrets.'
      : 'Their bio-signs went silent one by one. Avenge them.';
  box.appendChild(blurb);

  const buttons = document.createElement('div');
  buttons.className = 'end-buttons';
  box.appendChild(buttons);

  const retry = document.createElement('button');
  retry.id = 'end-retry';
  retry.textContent = 'Retry mission';
  retry.addEventListener('click', () => location.reload());
  buttons.appendChild(retry);

  const choose = document.createElement('button');
  choose.id = 'end-choose';
  choose.textContent = 'Choose another mission';
  choose.addEventListener('click', () => { location.href = location.pathname; });
  buttons.appendChild(choose);

  if (gameLog) {
    const section = document.createElement('div');
    section.className = 'end-log';

    const label = document.createElement('label');
    label.htmlFor = 'end-notes';
    label.textContent = 'Debrief notes (saved into the log):';
    section.appendChild(label);

    const notes = document.createElement('textarea');
    notes.id = 'end-notes';
    notes.rows = 3;
    notes.placeholder = 'How did the game go? How did the stealers play?';
    section.appendChild(notes);

    const download = document.createElement('button');
    download.id = 'end-download';
    download.textContent = 'Download game log';
    download.addEventListener('click', () => {
      gameLog.notes = notes.value;
      // Client-side Blob save, no network involved: logs are collected as
      // local files and analyzed offline.
      const blob = new Blob([gameLog.serialize()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = gameLog.filename();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    section.appendChild(download);

    box.appendChild(section);
  }

  document.body.appendChild(dialog);
  return dialog;
}
