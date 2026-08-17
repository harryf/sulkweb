/**
 * End-of-mission DOM dialog, shown by GameScene's gameOver handler on top of
 * the in-canvas MISSION COMPLETE / FAILED banner. Offers a retry (full reload
 * — same mission, same URL, so a pinned ?seed replays the identical game) and
 * a return to the mission-select homepage (the bare path, no query).
 */
export function showEndDialog(result: string): HTMLElement {
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

  document.body.appendChild(dialog);
  return dialog;
}
