/**
 * Fixed "Abort mission" control shown while a mission is being played (never
 * in attract/home mode). Two-click confirm: the first click arms the button
 * ("Abandon squad?") for a few seconds; a second click while armed returns to
 * the homepage. One stray click can never throw a game away.
 */
export function mountAbortButton(): HTMLElement {
  const btn = document.createElement('button');
  btn.id = 'abort-mission';
  btn.textContent = 'Abort mission';

  let armed = false;
  let disarmTimer: number | undefined;
  btn.addEventListener('click', () => {
    if (armed) {
      location.href = location.pathname; // strip query → home overlay
      return;
    }
    armed = true;
    btn.classList.add('armed');
    btn.textContent = 'Abandon squad?';
    disarmTimer = window.setTimeout(() => {
      armed = false;
      btn.classList.remove('armed');
      btn.textContent = 'Abort mission';
    }, 4000);
  });
  btn.addEventListener('blur', () => {
    if (disarmTimer !== undefined) window.clearTimeout(disarmTimer);
    armed = false;
    btn.classList.remove('armed');
    btn.textContent = 'Abort mission';
  });

  document.body.appendChild(btn);
  return btn;
}
