# Milestone 0 – “Hello Board”

# Goal

Produce the deliverable for *Milestone 0 – “Hello Board”* in the Sulk-Web repo:

- A **GameScene** (TypeScript) that loads `assets/themes/default/square_corridor.png`
and tiles a fixed 10 × 10 board at run-time.
- Scene is added to Vite-driven Phaser bootstrap so visiting
`http://localhost:5173/` shows the grid with **no console errors**.
- Include **unit tests** (Vitest) and a minimal **Playwright
integration test** that confirm the grid exists.

The workspace root looks like:

```jsx
packages/
└─ client/
├─ src/
│ ├─ main.ts <-- entry produced by Vite scaffold
│ └─ … <-- you add new files here
├─ index.html
├─ tsconfig.json
└─ package.json
assets/
└─ themes/default/square_corridor.png
pnpm-lock.yaml
```

## 1 Create/modify files

| File | What to put in it |
| --- | --- |
| **packages/client/src/scenes/PreloadScene.ts** | Phaser scene that pre-loads the corridor PNG (`this.load.image('square', 'assets/themes/default/square_corridor.png')`) and starts `GameScene` on `create()`. |
| **packages/client/src/scenes/GameScene.ts** | *Documented* TypeScript scene:<br>`ts<br>/**<br> * GameScene – draws a 10×10 board of corridor squares.<br> * Tiles are 64 px and the camera is fixed.<br>*/<br>`<br>In `create()`: loop `y:0..9, x:0..9`, `this.add.image(x*64, y*64, 'square').setOrigin(0)`.<br>Expose a public getter `get tileCount()` that returns the number of children added (for tests). |
| **packages/client/src/gameConfig.ts** | Phaser `Game` config: canvas 640×640, pixelArt true, parent `#app`, scenes `[PreloadScene, GameScene]`. |
| **packages/client/src/main.ts** | Import the config and instantiate `new Phaser.Game(config)`. Remove the Vite “counter” code. |
| **packages/client/src/global.d.ts** | Declare `interface Window { phaserGame: Phaser.Game }` (optional; useful for tests). |
| **packages/client/style.css** | (Leave as-is or clear.) |

## 2 Testing setup

### Vitest unit test

File: `packages/client/src/__tests__/GameScene.spec.ts`

```
import { describe, it, expect, beforeAll } from 'vitest'
import Phaser from 'phaser'
import GameScene from '../scenes/GameScene'

describe('GameScene tile grid', () => {
  let scene: GameScene

  beforeAll(async () => {
    // Use Phaser HEADLESS renderer for node environment
    const game = new Phaser.Game({
      type: Phaser.HEADLESS,
      width: 640,
      height: 640,
      scene: [GameScene],
      render: { pixelArt: true },
      physics: { default: 'arcade' }
    })
    // Wait for scene boot
    await new Promise<void>(resolve =>
      game.events.on('ready', () => {
        scene = game.scene.keys['GameScene'] as GameScene
        resolve()
      })
    )
  })

  it('creates exactly 100 tiles', () => {
    expect(scene.tileCount).toBe(100)
  })
})

```

*Mock the texture cache* with

```
Phaser.GameObjects.Image
```

stub if the asset cannot load in headless mode; simplest is to add:

```jsx
Phaser.GameObjects.Image.prototype.preDestroy = () => {}
```

### Playwright integration

File: `packages/client/tests/hello-board.spec.ts`

```
ts
Copy
import { test, expect } from '@playwright/test'

test('loads Sulk board without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  await page.goto('/')
  // Wait for tiles to draw – we query for <canvas>
  await expect(page.locator('canvas')).toBeVisible()
  expect(errors).toHaveLength(0)
})

```

Configure Playwright via `packages/client/playwright.config.ts`

with baseURL `http://localhost:5173`.

## 3 package.json tweaks (client)

Add dependencies:

```
jsonc
Copy
"dependencies": {
  "phaser": "^3.90.0"
},
"devDependencies": {
  "phaser": "^3.90.0",          // phaser types are bundled
  "vitest": "^1.4.2",
  "playwright": "^1.44.0",
  "@playwright/test": "^1.44.0"
}

```

Add scripts:

```json
json
Copy
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "test": "vitest run --dir src",
  "e2e": "playwright test"
}

```

## 4 README snippet

Append:

```
bash
Copy
### Run milestone 0

pnpm i
pnpm --filter ./packages/client dev      # open localhost:5173
pnpm --filter ./packages/client test     # unit
pnpm --filter ./packages/client e2e      # browser integration

```

## 5 Acceptance checklist

- `pnpm --filter ./packages/client dev` shows a 10×10 grid of the corridor tile.
- Browser console clean (no 404s, no errors).
- `pnpm --filter ./packages/client test` output: `1 passed, 0 failed`.
- `pnpm --filter ./packages/client e2e` output: **green**.

Include concise JSDoc on every public method so later generators inherit nice intellisense.