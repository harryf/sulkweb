import { test, expect, type Page } from '@playwright/test';
import { waitForGame, step } from './harness';

/**
 * Squad orders (2.x stage 3): Tab takes the squad, the right button gives it
 * standing intent, and one order reads three ways at once (the engine's
 * squad slot, the marker on the board, the word on the roster row). Space
 * holds the clock while the orders go out; a direct key takes one marine
 * back without disturbing his squad task.
 */

/** World coordinates to page coordinates through the canvas rect (the canvas
 *  is offset and scaled in the e2e viewport; see CLAUDE.md gotchas). */
async function toPage(page: Page, wx: number, wy: number): Promise<{ x: number; y: number }> {
  const box = (await page.locator('canvas').boundingBox())!;
  const view = await page.evaluate(() => {
    const s = (window as any).sulk.scene;
    return { sx: s.cameras.main.scrollX, sy: s.cameras.main.scrollY, gw: s.scale.width };
  });
  const scale = box.width / view.gw;
  return { x: box.x + (wx - view.sx) * scale, y: box.y + (wy - view.sy) * scale };
}

const T = 40;

/** Bring a world point on screen before clicking it. The camera clamps to
 *  its bounds, so toPage is always read afterwards rather than assumed. */
async function centerOn(page: Page, wx: number, wy: number): Promise<void> {
  await page.evaluate(([x, y]) => (window as any).sulk.scene.cameras.main.centerOn(x, y), [wx, wy]);
  await page.waitForTimeout(100);
}

/** Select one marine the way a roster click does (the stage 2 helper with
 *  the index as a parameter): the Selection plus the `selected` event the
 *  HUD and the roster listen on. Selecting a marine drops the squad. */
async function selectMarine(page: Page, index = 0): Promise<string> {
  return page.evaluate((i: number) => {
    const { sulk } = window as any;
    const m = sulk.engine.marines[i];
    sulk.Selection.select(m.id);
    sulk.PieceEvents.emit('selected', { pieceId: m.id, ap: { apRemaining: m.apRemaining, apInitial: m.apInitial } });
    sulk.scene.cameras.main.centerOn(m.pos.c * 40, m.pos.r * 40);
    return m.id as string;
  }, index);
}

/** Issue a squad order through a living member, as the client does. */
async function squadCommand(page: Page, order: unknown): Promise<void> {
  const ok = await page.evaluate((o: any) => {
    const { sulk } = window as any;
    const member = sulk.engine.marines.find((m: any) => m.alive);
    return sulk.command(member.id, { type: 'squadOrder', order: o }) as boolean;
  }, order);
  expect(ok).toBe(true);
}

const squadState = (page: Page) =>
  page.evaluate(() => {
    const st = (window as any).sulk.engine.squadState('Calvin');
    return st ? { order: st.order, coordinated: st.coordinated, dueTick: st.dueTick } : null;
  });

const squadMarkers = (page: Page) =>
  page.evaluate(() => (window as any).sulk.scene.children.list
    .filter((c: any) => c.name === 'squad-marker')
    .map((c: any) => ({ squad: c.getData('squad'), kind: c.getData('kind') })));

const taskMarkerIds = (page: Page) =>
  page.evaluate(() => (window as any).sulk.scene.children.list
    .filter((c: any) => c.name === 'order-marker' && c.getData('level') === 2)
    .map((c: any) => c.getData('pieceId') as string).sort());

const selection = (page: Page) =>
  page.evaluate(() => {
    const { sulk } = window as any;
    return { squad: sulk.Selection.getSquad(), marine: sulk.Selection.get() };
  });

const DEFEND_ROOM = { type: 'defend', x: 10, y: 7 };

/**
 * Switch the stealer side off, the way the engine suite's `quiet` mission
 * fixture does: kill what is on the board and stop the reinforcements. Only
 * the long defend walk needs it, and it needs it badly: space_hulk_1 seed 1
 * lands its two opening blips in the room by tick 25 and three marines are
 * dead before anyone reaches a post, so a firefight would stand in for the
 * arrival under test. One cull plus the zeroed rate holds for the whole walk
 * (no blip is left booked).
 */
async function quietStealers(page: Page): Promise<void> {
  const left = await page.evaluate(() => {
    const e = (window as any).sulk.engine;
    e.mission.blipsPerTurn = 0;
    e.state.pieces.filter((p: any) => p.kind !== 'marine' && p.alive).forEach((p: any) => p.die());
    return e.state.pieces.filter((p: any) => p.kind !== 'marine' && p.alive).length as number;
  });
  expect(left).toBe(0);
}

test('a squad order through the command path: the slot, the marker, the roster word, then five marines on their posts', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');
  await quietStealers(page);
  const ids = await page.evaluate(() => (window as any).sulk.engine.marines.map((m: any) => m.id as string));
  expect(ids).toHaveLength(5);
  expect(await page.evaluate(() => (window as any).sulk.engine.squadNames())).toEqual(['Calvin']);

  // Nothing is keyed on the squad until an order arrives.
  expect(await squadState(page)).toBeNull();
  await squadCommand(page, DEFEND_ROOM);

  // The slot: relayed through the living sergeant, so it is coordinated and
  // takes effect on the next tick.
  expect(await squadState(page)).toEqual({ order: DEFEND_ROOM, coordinated: true, dueTick: 1 });
  // The marker on the board and the word on the roster row.
  expect(await squadMarkers(page)).toEqual([{ squad: 'Calvin', kind: 'defend' }]);
  await expect(page.locator('section.squad-row[data-squad="Calvin"] h3 .s-order')).toHaveText('DEFEND');
  await expect(page.locator('section.squad-row[data-squad="Calvin"]')).toHaveClass(/ordered/);

  // The planner's first tick writes every member a task (the level 2 slot)
  // and a marker in the squad colour; no member carries a player's order.
  await step(page, 1);
  const planned = await page.evaluate(() => (window as any).sulk.engine.marines
    .map((m: any) => ({ id: m.id, order: m.order, task: m.task })));
  for (const m of planned) {
    expect(m.task, `marine ${m.id} has a squad task`).not.toBeNull();
    expect(m.order, `marine ${m.id} carries no player order`).toBeNull();
  }
  expect(await taskMarkerIds(page)).toEqual([...ids].sort());
  for (const id of ids) {
    await expect(page.locator(`[data-piece-id="${id}"] .m-order`)).toHaveText('DEFEND');
  }

  // Given time they walk to their posts: bolters on overwatch, the flamer
  // holding. The task is read back at the end because the planner re-plans
  // every tick and may reshuffle posts on the way.
  await step(page, 80);
  const posted = await page.evaluate(() => (window as any).sulk.engine.marines
    .map((m: any, i: number) => ({
      i, id: m.id, alive: m.alive, pos: { c: m.pos.c, r: m.pos.r },
      task: m.task, overwatch: m.overwatch ?? null,
    })));
  for (const m of posted) {
    expect(m.alive, `marine ${m.i} survived the walk`).toBe(true);
    expect(m.task, `marine ${m.i} still holds a task`).not.toBeNull();
    expect(m.pos, `marine ${m.i} stands on his post`).toEqual({ c: m.task.x, r: m.task.y });
    // marines[4] is the heavy flamer at the head of the column: he holds his
    // post, the four bolters watch theirs.
    expect(m.task.then).toBe(m.i === 4 ? 'hold' : 'overwatch');
    if (m.i !== 4) expect(m.overwatch, `marine ${m.i} is on overwatch`).toBe(true);
  }

  // Clearing the order takes the slot, both markers and the words with it.
  await page.evaluate(() => {
    const { sulk } = window as any;
    const member = sulk.engine.marines.find((m: any) => m.alive);
    sulk.command(member.id, { type: 'clearSquadOrder' });
  });
  expect((await squadState(page))!.order).toBeNull();
  expect(await squadMarkers(page)).toEqual([]);
  expect(await taskMarkerIds(page)).toEqual([]);
  await expect(page.locator('section.squad-row[data-squad="Calvin"] h3 .s-order')).toHaveText('');
  for (const id of ids) {
    await expect(page.locator(`[data-piece-id="${id}"] .m-order`)).not.toHaveText('DEFEND');
  }
  expect(errors).toHaveLength(0);
});

test('Tab takes the squad, Esc is its hold order, and Esc with nothing selected is the free pause', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');

  // Tab with nothing selected takes the first squad: rings on the board, the
  // roster row lit, the marine selection cleared (the two are exclusive).
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  expect(await selection(page)).toEqual({ squad: 'Calvin', marine: null });
  expect(await page.evaluate(() => (window as any).sulk.scene.children.list
    .filter((c: any) => c.name === 'squad-highlight')
    .map((c: any) => c.getData('squad')))).toEqual(['Calvin']);
  await expect(page.locator('section.squad-row[data-squad="Calvin"]')).toHaveClass(/selected/);

  // One squad on the board: cycling comes back round to it.
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  expect((await selection(page)).squad).toBe('Calvin');

  // Selecting a marine drops the squad, and Tab takes his squad back.
  const id = await selectMarine(page, 0);
  expect(await selection(page)).toEqual({ squad: null, marine: id });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  expect(await selection(page)).toEqual({ squad: 'Calvin', marine: null });

  // Esc with a squad selected is its hold order: the order goes, the
  // selection goes, and the free pause is not touched.
  await squadCommand(page, DEFEND_ROOM);
  expect((await squadState(page))!.order).toEqual(DEFEND_ROOM);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  expect((await squadState(page))!.order).toBeNull();
  expect((await selection(page)).squad).toBeNull();
  expect(await page.evaluate(() => (window as any).sulk.scene.isPaused)).toBe(false);

  // With nothing selected Esc is the pause again, both ways.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).sulk.scene.isPaused)).toBe(true);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).sulk.scene.isPaused)).toBe(false);
  expect(errors).toHaveLength(0);
});

test('right-click with a squad selected: a square defends it, Shift advances there, a door edge clears it', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  expect((await selection(page)).squad).toBe('Calvin');

  // A plain right-click on the room: defend it.
  await centerOn(page, 10 * T + T / 2, 7 * T + T / 2);
  let pt = await toPage(page, 10 * T + T / 2, 7 * T + T / 2);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.waitForTimeout(100);
  expect((await squadState(page))!.order).toEqual({ type: 'defend', x: 10, y: 7 });

  // Shift down the corridor: advance there (it replaces the defend).
  await centerOn(page, 10 * T + T / 2, 13 * T + T / 2);
  pt = await toPage(page, 10 * T + T / 2, 13 * T + T / 2);
  // page.mouse.click takes no modifiers option, so Shift is held around it.
  await page.keyboard.down('Shift');
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.keyboard.up('Shift');
  await page.waitForTimeout(100);
  expect((await squadState(page))!.order).toEqual({ type: 'advance', x: 10, y: 13 });
  expect(await squadMarkers(page)).toEqual([{ squad: 'Calvin', kind: 'advance' }]);

  // The north door of the room, clicked on its edge midpoint: clear it.
  // The door must still be closed for the edge to be a target at all.
  expect(await page.evaluate(() => (window as any).sulk.engine.state.board
    .doorsAt({ c: 10, r: 5 }).some((d: any) => d.facing === 0 && !d.isOpen))).toBe(true);
  await centerOn(page, 10.5 * T, 5 * T);
  pt = await toPage(page, 10.5 * T, 5 * T);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.waitForTimeout(100);
  expect((await squadState(page))!.order).toEqual({ type: 'clear', x: 10, y: 5, facing: 0 });
  expect(await squadMarkers(page)).toEqual([{ squad: 'Calvin', kind: 'clear' }]);
  expect(errors).toHaveLength(0);
});

test('the command pause holds the clock while orders still go out and direct keys do not', async ({ page }) => {
  // The one spec that wants a running clock: 250ms a tick.
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1&tick=250');

  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).sulk.scene.isCommandPaused)).toBe(true);
  expect(await page.evaluate(() => (window as any).sulk.scene.children.list
    .some((c: any) => c.name === 'command-pause'))).toBe(true);

  // The clock is held: two and a bit ticks' worth of wall clock buys nothing.
  const held = await page.evaluate(() => (window as any).sulk.engine.tickCount as number);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as any).sulk.engine.tickCount)).toBe(held);

  // Orders still go out while it is held.
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  expect((await selection(page)).squad).toBe('Calvin');
  await centerOn(page, 10 * T + T / 2, 7 * T + T / 2);
  const pt = await toPage(page, 10 * T + T / 2, 7 * T + T / 2);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.waitForTimeout(100);
  expect((await squadState(page))!.order).toEqual({ type: 'defend', x: 10, y: 7 });
  expect(await page.evaluate(() => (window as any).sulk.engine.tickCount)).toBe(held);

  // Direct control does not: a key with a marine selected reaches no command.
  await selectMarine(page, 0);
  await page.evaluate(() => {
    const { sulk } = window as any;
    (window as any).__cmds = [];
    sulk.PieceEvents.on('command', (p: any) => (window as any).__cmds.push(p.command.type));
  });
  await page.keyboard.press('w');
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => (window as any).__cmds)).toEqual([]);

  // Space again and the clock runs on.
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).sulk.scene.isCommandPaused)).toBe(false);
  const resumed = await page.evaluate(() => (window as any).sulk.engine.tickCount as number);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as any).sulk.engine.tickCount)).toBeGreaterThan(resumed);
  expect(errors).toHaveLength(0);
});

test('a direct key takes one marine back from a live squad order and drops his task (the stage 4 rider); the rest keep theirs', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');
  await quietStealers(page); // the pin must lapse with the game still on (a dead flamer ends a flame mission)
  await squadCommand(page, DEFEND_ROOM);
  await step(page, 1);

  const id = await selectMarine(page, 1);
  const before = await page.evaluate((pid: string) => {
    const m = (window as any).sulk.engine.findPiece(pid);
    return { order: m.order, task: m.task };
  }, id);
  expect(before.task).not.toBeNull();
  expect(before.order).toBeNull();

  await page.evaluate(() => {
    const { sulk } = window as any;
    (window as any).__cmds = [];
    sulk.PieceEvents.on('command', (p: any) => (window as any).__cmds.push(p.command.type));
  });
  await page.keyboard.press('d');
  await page.waitForTimeout(150);

  // The turn reached the engine; the player taking him drops his squad task
  // at once and the planner leaves him out, while his squad-mates keep theirs.
  expect(await page.evaluate(() => (window as any).__cmds)).toEqual(['turn']);
  const after = await page.evaluate((pid: string) => {
    const { sulk } = window as any;
    const m = sulk.engine.findPiece(pid);
    const others = sulk.engine.marines.filter((x: any) => x.id !== pid && x.alive).map((x: any) => x.task !== null);
    return { order: m.order, task: m.task, others };
  }, id);
  expect(after.order).toBeNull();
  expect(after.task).toBeNull();
  expect(after.others.some((t: boolean) => t)).toBe(true);
  // The pin lapses a cycle after the key press: the planner takes him back.
  await step(page, 41);
  const back = await page.evaluate((pid: string) => (window as any).sulk.engine.findPiece(pid).task !== null, id);
  expect(back).toBe(true);
  expect(errors).toHaveLength(0);
});
