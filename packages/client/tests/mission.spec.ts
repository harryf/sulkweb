import { test, expect, type Page } from '@playwright/test';
import { waitForGame, step } from './harness';

/**
 * Mission orders (2.x stage 4 step 4): I sends a squad to whatever the
 * mission wants of it, Tab reaches past the last squad to the all-squads
 * stop, and an order given there goes out as ONE mission order that the
 * engine fans out. Three missions cover the three readings of `objective`:
 * an advance to a threshold (space_hulk_1), an advance per squad with two
 * squads on the board (space_hulk_3), and a blockade of the entries
 * (space_hulk_2), whose posts are task markers and whose squad marker is
 * deliberately absent.
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

/** Select one marine the way a roster click does: the Selection plus the
 *  `selected` event the HUD and the roster listen on. Selecting a marine
 *  drops the squad. */
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

/**
 * Switch the stealer side off, the way the engine suite's `quiet` mission
 * fixture does: kill what is on the board and stop the reinforcements, so a
 * firefight can never stand in for the behaviour under test.
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

/** Start recording the two engine events a mission order is judged by: the
 *  commands that reached the log, and the per-squad order changes. */
async function recordEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const { sulk } = window as any;
    (window as any).__cmds = [];
    (window as any).__squadChanges = [];
    sulk.PieceEvents.on('command', (p: any) => (window as any).__cmds.push(p.command));
    sulk.PieceEvents.on('squadOrderChanged', (p: any) => (window as any).__squadChanges.push(p.squad));
  });
}

const commands = (page: Page) => page.evaluate(() => (window as any).__cmds as any[]);
const squadChanges = (page: Page) => page.evaluate(() => (window as any).__squadChanges as string[]);

const orderOf = (page: Page, squad: string) =>
  page.evaluate((s: string) => (window as any).sulk.engine.squadState(s)?.order ?? null, squad);

const selection = (page: Page) =>
  page.evaluate(() => {
    const { sulk } = window as any;
    return { squad: sulk.Selection.getSquad(), marine: sulk.Selection.get() };
  });

const squadMarkers = (page: Page) =>
  page.evaluate(() => (window as any).sulk.scene.children.list
    .filter((c: any) => c.name === 'squad-marker')
    .map((c: any) => ({ squad: c.getData('squad'), kind: c.getData('kind') })));

const taskMarkerIds = (page: Page) =>
  page.evaluate(() => (window as any).sulk.scene.children.list
    .filter((c: any) => c.name === 'order-marker' && c.getData('level') === 2)
    .map((c: any) => c.getData('pieceId') as string).sort());

const highlightSquads = (page: Page) =>
  page.evaluate(() => (window as any).sulk.scene.children.list
    .filter((c: any) => c.name === 'squad-highlight')
    .map((c: any) => c.getData('squad') as string));

/** A real press, then a beat for Phaser to drain its key queue. */
async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
  await page.waitForTimeout(100);
}

test('I sends the one squad to the objective, and does nothing with a marine selected', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_1&seed=1');
  expect(await page.evaluate(() => (window as any).sulk.engine.squadNames())).toEqual(['Calvin']);

  await pressKey(page, 'Tab');
  expect((await selection(page)).squad).toBe('Calvin');

  await recordEvents(page);
  await pressKey(page, 'i');

  // The threshold of the objective room: the last square outside its section
  // on the walk, so the squad stops at the door rather than in the fire.
  expect(await orderOf(page, 'Calvin')).toEqual({ type: 'advance', x: 17, y: 20 });
  // The log carries the REQUEST, not the resolved order: a replay resolves
  // it against the same board and lands on the same square.
  expect(await commands(page)).toEqual([{ type: 'squadOrder', order: { type: 'objective' } }]);

  // I is a squad key: with a marine selected it issues nothing at all.
  await selectMarine(page, 0);
  expect((await selection(page)).squad).toBeNull();
  await pressKey(page, 'i');
  expect(await commands(page)).toHaveLength(1);
  expect(errors).toHaveLength(0);
});

test('Tab reaches the all-squads stop, and one I there is one mission order to both squads', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_3&seed=1');
  await quietStealers(page);
  expect(await page.evaluate(() => (window as any).sulk.engine.squadNames())).toEqual(['Abel', 'Ilyich']);

  // Two squads, so the ring is Abel, Ilyich, then every squad at once.
  await pressKey(page, 'Tab');
  expect((await selection(page)).squad).toBe('Abel');
  await pressKey(page, 'Tab');
  expect((await selection(page)).squad).toBe('Ilyich');
  await pressKey(page, 'Tab');
  expect(await selection(page)).toEqual({ squad: '*', marine: null });

  // Every roster row is lit and the rings cover the whole force.
  await expect(page.locator('section.squad-row[data-squad="Abel"]')).toHaveClass(/selected/);
  await expect(page.locator('section.squad-row[data-squad="Ilyich"]')).toHaveClass(/selected/);
  expect(await highlightSquads(page)).toEqual(['*']);

  await recordEvents(page);
  await pressKey(page, 'i');

  // Each squad resolved the objective for itself (its own nearest exit), off
  // ONE command in the log and one order change per squad.
  expect((await orderOf(page, 'Abel')).type).toBe('advance');
  expect((await orderOf(page, 'Ilyich')).type).toBe('advance');
  expect(await commands(page)).toEqual([{ type: 'missionOrder', order: { type: 'objective' } }]);
  expect(await squadChanges(page)).toEqual(['Abel', 'Ilyich']);

  // A right-click with every squad selected reads the same as a squad's, and
  // reaches every squad: both defend the square under the pointer.
  const lead = await page.evaluate(() => {
    const m = (window as any).sulk.engine.marines[0];
    return { c: m.pos.c as number, r: m.pos.r as number };
  });
  await centerOn(page, lead.c * T + T / 2, lead.r * T + T / 2);
  const pt = await toPage(page, lead.c * T + T / 2, lead.r * T + T / 2);
  await page.mouse.click(pt.x, pt.y, { button: 'right' });
  await page.waitForTimeout(100);
  const defend = { type: 'defend', x: lead.c, y: lead.r };
  expect(await orderOf(page, 'Abel')).toEqual(defend);
  expect(await orderOf(page, 'Ilyich')).toEqual(defend);

  // Esc there drops every live order and the selection with them.
  await pressKey(page, 'Escape');
  expect(await orderOf(page, 'Abel')).toBeNull();
  expect(await orderOf(page, 'Ilyich')).toBeNull();
  expect((await selection(page)).squad).toBeNull();
  expect(await page.evaluate(() => (window as any).sulk.scene.isPaused)).toBe(false);
  expect(errors).toHaveLength(0);
});

test('on Exterminate the objective is a blockade: the roster word, no squad marker, a post per marine', async ({ page }) => {
  const errors = await waitForGame(page, 'mission=space_hulk_2&seed=1');
  expect(await page.evaluate(() => (window as any).sulk.engine.squadNames())).toEqual(['Constantine']);

  await pressKey(page, 'Tab');
  expect((await selection(page)).squad).toBe('Constantine');
  await pressKey(page, 'i');

  expect(await orderOf(page, 'Constantine')).toEqual({ type: 'blockade' });
  await expect(page.locator('section.squad-row[data-squad="Constantine"] h3 .s-order')).toHaveText('BLOCKADE');
  // A blockade names no square, so nothing is drawn on the board for it.
  expect(await squadMarkers(page)).toEqual([]);

  // The posts are the level 2 task markers instead: one per marine, written
  // by the planner's first tick.
  await step(page, 1);
  expect(await taskMarkerIds(page)).toHaveLength(5);
  expect(errors).toHaveLength(0);
});
