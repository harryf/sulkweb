# Game Setup

## Recommended framework → **Phaser 3 + TypeScript**

| Why it fits Sulk | Notes |
| --- | --- |
| **2-D, sprite-centric** scene graph that already supports layers, groups, cameras, tweens. No 3-D bloat. | Board squares, overlays, HUD clocks and dialogs map one-to-one to Phaser `GameObjects`. |
| **Asset pipeline** for images, bitmap fonts, audio (WebAudio or fallback). | Mirrors current `/data` tree; loader auto-detects resolution and device. |
| **Runs everywhere** (Chrome, Firefox, Safari, Edge, mobile browsers) without plugins. | Generates a single ES-module bundle; no Unity-size downloads. |
| **Rich plugin ecosystem**: grid path-finding, UI widgets, ECS helpers, scene transitions. | We need only a few kilobytes of extra code. |
| **TypeScript templates & Vite** let you build lightning-fast dev loops, strict typing for the rule engine. | The AI and rules layer become easy-to-unit-test. |
| **Future multiplayer**: Phaser itself is presentation-only; deterministic logic can live in a headless Node build or be replayed remotely via WebSocket / WebRTC. | Compatible with Colyseus, socket.io, or custom roll-back netcode. |

*(If you were leaning toward React-Pixi, PlayCanvas, Godot-HTML5 or Unity-WebGL they’ll all work, but they add size, extra wrappers, or 3-D abstractions you don’t need.)*

---

## 2. High-level architecture

```
pgsql
Copy
/sulk-web/
├─ packages/
│  ├─ engine/          ← pure rules & AI (no Phaser)
│  └─ client/          ← Phaser front-end
├─ assets/             ← images/, sounds/, fonts/, themes/
└─ missions/           ← JSON or YAML converted from original .py modules

```

### 2.1 `packages/engine` — core game logic

- **Language** : TypeScript (strict mode)
    
    *Purely functional / “no side-effects”*, so it can run in browser, Node, WebWorker, or authoritative server later.
    
- **Sub-modules**

| Dir | Contents |
| --- | --- |
| `board/` | `Square`, `Section`, LOS & path-finder utilities. |
| `pieces/` | `Piece` base + concrete subclasses (`Genestealer`, `Blip`, `Terminator*`, …). |
| `teams/` | Team state, AP/CP clocks, victory tracking. |
| `phases/` | Turn-state classes (`MarineAction`, `StealerReinforce`, …). |
| `actions/` | Command objects (`Move`, `Shoot`, `Turn`, `UseDoor`, …) – validated by queries above. |
| `ai/` | A port of *ai0* logic; outputs `Action[]` each frame. |
| `mission-loader/` | Parses JSON mission files; returns immutable descriptors. |
| `reducers/` | Pure functions that mutate game state given an `Action`. |
| `serialisation/` | `encode(state) -> JSON` / `decode()` for save-games & networking. |

*Unit tests* live beside each module and run under Jest or Vitest.

### 2.2 `packages/client` — Phaser runtime

- **Scene graph**

| Phaser Scene | Responsibility |
| --- | --- |
| **BootScene** | Pre-load minimal assets, show loading bar. |
| **PreloadScene** | Load theme images, audio, mission JSON. |
| **GameScene** | Instantiate `GameEngine` instance, create render layers:`board`, `features`, `pieces`, `effects`, `hud`, `dialogs`, `tooltips`. |
| **UIScene** (optional React or Phaser-UI) | Buttons, pause menu, options. |
- **Object mapping**

| Engine object | Phaser object(s) |
| --- | --- |
| `Square` | Static `Image` in *board* layer (corridor/room texture). |
| `Feature` | `Sprite` in *features* layer; `Door` swaps frame `open`/`closed`. |
| `Piece` | `Sprite` in *pieces* layer; `MiniSprite` clones in a separate camera. |
| `HiLite`, `FacingDec`, `Marker` | `Image` in *effects* layer; tweened alpha. |
| Clocks / scroll messages | Bitmap-text in *hud* scene. |
- **Input routing**

```
pgsql
Copy
pointerdown/keyboard → translate to high-level “Intent” →
engine.validate() → if OK dispatch(Action) → engine.newState

```

The same code path will feed AI or later multiplayer sync.

- **Render pipeline**

```
sql
Copy
engineState → diff against last frame → minimal sprite creates / moves →
cameras.main.scrollX/Y = boardOffset → Phaser takes care of draw order

```

### 2.3 Assets

- Keep folder names identical (`images/`, `sounds/`, `themes/default/…`).
    
    Loader first checks `<selectedTheme>/<file>` then falls back to `default/`.
    
- Convert fonts to BitmapFonts (Phaser’s BMFont or MSDF) for crisp scaling.
- Sounds remain WAV/OGG; Phaser auto-decodes to WebAudio.

---

## 3. Build & tooling

| Tool | Why |
| --- | --- |
| **Vite** | Instant reload, tree-shaking, splits vendor (Phaser) from app bundle. |
| **ESLint + Prettier** | Code hygiene across engine & client. |
| **Vitest/Jest** | Deterministic tests for engine rules. |
| **Cypress/Playwright** | End-to-end: load a mission, script a few actions, assert board hash. |
| **GitHub Actions** | CI: run lints/tests, deploy static build to GitHub Pages, Netlify or S3. |

---

## 4. Migration path

1. **Convert assets** – run a small script that copies PNG/WAV directly; convert original TTF to BMFont atlas.
2. **Transcode missions** – Execute the old Python modules offline once to emit JSON versions of `BOARD`, `FLAGS`, etc.
3. **Port rules** – Start with Piece + Board movement, then close-combat, then shooting, then special weapons. Write unit tests for each rule as you go.
4. **Render stub** – Just draw the board and move one sprite around; verify coordinate math.
5. **Hook UI** – Map clicks/keys to `Intents`, show basic HUD.
6. **Add AI stack** – Re-implement *ai0* as pure functions in `packages/engine/ai`.
7. **Polish & theme switcher** – add splash screen, pause menu, audio toggles.

---

### Why this structure scales to multiplayer later

- **Engine is deterministic & serialisable** – same rule code runs on host or authoritative server.
- **Action log** – You already dispatch actions; networking layer can replicate those over WebSocket.
- **Phaser scene is thin** – swapping to PixiJS, React-Canvas, or native mobile later won’t touch rules.

---

**Next steps**

- Scaffold the repo (`pnpm create vite sulk-web --template vanilla-ts`).
- Add Phaser (`pnpm add phaser`).
- Drop images & a stub mission, draw the corridor grid.
- Port the move/turn cost tables into TypeScript enums and run the first unit test.