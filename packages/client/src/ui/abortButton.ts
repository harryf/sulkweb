/**
 * Fixed "Abort mission" control shown while a mission is being played (never
 * in attract/home mode). Two-click confirm: the first click arms the button
 * ("Abandon squad?") for a few seconds; a second click while armed returns to
 * the homepage. One stray click can never throw a game away.
 *
 * The button is blurred after every activation: a focused <button> re-fires
 * on Enter, and Enter is the END-TURN key — without the blur, "click abort,
 * change mind, press Enter to end the turn" would abandon the mission.
 * Disarming is purely time-based (4s).
 */
export function mountAbortButton(): HTMLElement {
  const btn = document.createElement('button');
  btn.id = 'abort-mission';
  btn.textContent = 'Abort mission';

  let armed = false;
  let disarmTimer: number | undefined;
  btn.addEventListener('click', () => {
    const wasArmed = armed;
    btn.blur();
    if (wasArmed) {
      location.href = location.pathname; // strip query → home overlay
      return;
    }
    armed = true;
    btn.classList.add('armed');
    btn.textContent = 'Abandon squad?';
    if (disarmTimer !== undefined) window.clearTimeout(disarmTimer);
    disarmTimer = window.setTimeout(() => {
      armed = false;
      btn.classList.remove('armed');
      btn.textContent = 'Abort mission';
    }, 4000);
  });

  document.body.appendChild(btn);
  return btn;
}
