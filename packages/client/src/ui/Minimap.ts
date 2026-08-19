import Phaser from 'phaser';
import { GameEngine, Square } from '@sulk/engine/index.js'; // Assuming GameEngine and Square are exported from @sulk/engine
import { projectCamToMini, miniToWorld } from '../utils/cameraBox';
import type { CamRect, MiniRect } from '../utils/cameraBox';
import { RADAR, isSergeant, ringDurationMs, pulseTimings, echoAlpha } from '../utils/radarLogic';
import type { RadarPieceView } from '../utils/radarLogic';
import { HUD_WIDTH, MINI_MAP_MARGIN } from '../config.js';

export interface MinimapOptions {
  tile: number; // full tile size in pixels
  width: number; // desired width of the minimap in pixels
}

/** Fuzzy radial "radar return" texture — generated once per game (the
 *  TextureManager is game-global), no assets. A tight bright core reads solid
 *  (stealers); a low, early-fading core reads as an indistinct smear (blips,
 *  decoys included). */
function makeCloudTexture(
  scene: Phaser.Scene, key: string, size: number, coreAlpha: number, coreStop: number,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return; // headless/mock context — radar simply stays dark
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(130,255,160,${coreAlpha})`);
  g.addColorStop(coreStop, `rgba(80,225,120,${coreAlpha * 0.55})`);
  g.addColorStop(1, 'rgba(60,200,100,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

export class Minimap extends Phaser.GameObjects.Container {
  private engine: GameEngine;
  private opts: MinimapOptions;
  private miniMapWidth: number;
  private miniMapHeight: number;
  private boardPixelWidth: number;
  private boardPixelHeight: number;
  private mapScale: number;
  private viewportBox: Phaser.GameObjects.Graphics;
  /** Contact echoes live UNDER the marine dots and viewport box. */
  private echoLayer: Phaser.GameObjects.Container;
  private echoes = new Map<string, Phaser.GameObjects.Image>();
  private marineLayer: Phaser.GameObjects.Graphics;
  private ringGfx: Phaser.GameObjects.Graphics;
  /** Active pulse sweeps: origin px + progress 0..1 (tween-driven). */
  private rings: { x: number; y: number; t: number }[] = [];
  /** Last projected viewport rect, in minimap-local px — e2e probe surface. */
  public lastBox: MiniRect | null = null;
  /** Click handler — GameScene points this at camera centerOn (ISC-672). */
  public onFocus?: (worldX: number, worldY: number) => void;
  /** While frozen (stealer-phase replay) the dots hold their last frame —
   *  the engine already holds FINAL state, and the radar must not leak it
   *  ahead of the animation (same invariant the sprite layer follows). */
  public frozen = false;
  /** e2e probe: marine dot positions in MINIMAP-LOCAL px (ISC-678). */
  public lastMarineDots: { x: number; y: number }[] = [];
  /** e2e probe: pulse origins in BOARD squares + contact count (ISC-688). */
  public lastPulse: { origins: { x: number; y: number }[]; contacts: number } | null = null;

  constructor(
    scene: Phaser.Scene,
    engine: GameEngine,
    opts: MinimapOptions
  ) {
    super(scene);
    this.engine = engine;
    this.opts = opts;

    const board = this.engine.state.board;
    this.boardPixelWidth = board.width * this.opts.tile;
    this.boardPixelHeight = board.height * this.opts.tile;

    this.mapScale = this.opts.width / this.boardPixelWidth;
    this.miniMapWidth = this.opts.width;
    this.miniMapHeight = this.boardPixelHeight * this.mapScale;

    // Create minimap background squares
    board.allSquares().forEach((square: Square) => {
      const miniSquareSize = this.opts.tile * this.mapScale;
      const x = square.x * this.opts.tile * this.mapScale;
      const y = square.y * this.opts.tile * this.mapScale;

      const image = scene.add.image(x + miniSquareSize / 2, y + miniSquareSize / 2, 'mini_square');
      image.setScale((this.opts.tile * this.mapScale) / image.width); // Scale to represent one game tile on the minimap
      image.setTint(square.kind === 'room' ? 0xA56A2A : 0x666666); // Brown for room, Grey for corridor
      this.add(image);
    });

    // Radar layers, bottom-up: echoes under dots under rings under the box.
    makeCloudTexture(scene, 'echo_stealer', 32, 1, 0.35);
    makeCloudTexture(scene, 'echo_blip', 32, 0.55, 0.15);
    this.echoLayer = scene.add.container(0, 0);
    this.add(this.echoLayer);
    this.marineLayer = scene.add.graphics();
    this.add(this.marineLayer);
    this.ringGfx = scene.add.graphics();
    this.add(this.ringGfx);

    // Containers do not clip children, and the ring sweep radius is the
    // minimap DIAGONAL — unmasked it would paint across the game board.
    // The HUD is screen-fixed, so a screen-space geometry mask does it; the
    // mask shape stays off the display list but keeps scrollFactor 0 so it
    // does not drift with the camera. Echo images overhang too — same mask.
    const maskShape = scene.make.graphics({}, false).setScrollFactor(0);
    maskShape.fillRect(
      scene.scale.width - HUD_WIDTH + MINI_MAP_MARGIN, MINI_MAP_MARGIN,
      this.miniMapWidth, this.miniMapHeight,
    );
    const radarMask = maskShape.createGeometryMask();
    this.ringGfx.setMask(radarMask);
    this.echoLayer.setMask(radarMask);

    // Create viewport box
    this.viewportBox = scene.add.graphics();
    this.add(this.viewportBox);

    // Click-to-focus: an invisible interactive rect on top (same pattern as
    // the HUD's DONE button). Its own scrollFactor must be 0 — Phaser's input
    // hit-test uses the child's factor, not the container's.
    const clickZone = scene.add.rectangle(0, 0, this.miniMapWidth, this.miniMapHeight, 0, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    clickZone.on('pointerdown', (_p: Phaser.Input.Pointer, localX: number, localY: number) => {
      const w = miniToWorld(localX, localY, this.mapScale);
      this.onFocus?.(w.x, w.y);
    });
    this.add(clickZone);

    // Containers have no intrinsic size — set it so layout code can read .width/.height
    this.setSize(this.miniMapWidth, this.miniMapHeight);
  }

  /** Board square centre → minimap-local px. */
  private toMini(c: number, r: number): { x: number; y: number } {
    return {
      x: (c + 0.5) * this.opts.tile * this.mapScale,
      y: (r + 0.5) * this.opts.tile * this.mapScale,
    };
  }

  private pieces(): RadarPieceView[] {
    return this.engine.state.pieces as unknown as RadarPieceView[];
  }

  updateCam(cam: Phaser.Cameras.Scene2D.Camera): void {
    const camRect: CamRect = {
      x: cam.scrollX,
      y: cam.scrollY,
      w: cam.width,
      h: cam.height,
    };

    const boardSize = {
      w: this.boardPixelWidth,
      h: this.boardPixelHeight,
    };

    const miniBounds: MiniRect = {
      x: 0,
      y: 0,
      w: this.miniMapWidth,
      h: this.miniMapHeight,
    };

    const miniCamRect = projectCamToMini(camRect, boardSize, miniBounds, 2);
    this.lastBox = miniCamRect;

    this.viewportBox.clear();
    this.viewportBox.lineStyle(2, 0xFFFFFF, 1);
    this.viewportBox.strokeRect(
      miniCamRect.x,
      miniCamRect.y,
      miniCamRect.w,
      miniCamRect.h
    );

    if (!this.frozen) this.drawMarines();
    this.drawRings();
  }

  /** Living marines as hard red dots — always on, sergeant or not (ISC-693). */
  private drawMarines(): void {
    this.marineLayer.clear();
    this.marineLayer.fillStyle(RADAR.marineDotColor, 1);
    this.lastMarineDots = [];
    for (const p of this.pieces()) {
      if (p.kind !== 'marine' || !p.alive) continue;
      const at = this.toMini(p.pos.c, p.pos.r);
      this.marineLayer.fillCircle(at.x, at.y, RADAR.marineDotRadiusPx);
      this.lastMarineDots.push(at);
    }
  }

  /** Redraw active pulse sweeps (tween-driven progress, per-frame paint). */
  private drawRings(): void {
    this.ringGfx.clear();
    if (!this.rings.length) return;
    const maxR = Math.hypot(this.miniMapWidth, this.miniMapHeight);
    for (const ring of this.rings) {
      this.ringGfx.lineStyle(1.5, RADAR.ringColor, 0.7 * (1 - ring.t));
      this.ringGfx.strokeCircle(ring.x, ring.y, ring.t * maxR);
    }
  }

  /** Texture key of a contact's echo — e2e probe pinning the kind→style
   *  wiring (ISC-682/684): swap the ternary arms and this fails. */
  echoTexture(id: string): string | null {
    return this.echoes.get(id)?.texture.key ?? null;
  }

  /** Echoes currently showing anything — e2e probe surface (ISC-686/692). */
  activeEchoes(): number {
    let n = 0;
    for (const img of this.echoes.values()) if (img.alpha > 0.01) n += 1;
    return n;
  }

  /**
   * One auspex sweep, driven by the motion-tracker ping (ISC-691). Rings
   * expand from every living sergeant; each stealer/blip echo lights up as
   * the wavefront reaches it and fades until the next pulse. No living
   * sergeant: the scope goes dark (ISC-692).
   */
  pulse(intervalMs: number): void {
    if (this.frozen) return; // mid-replay the engine state is a spoiler
    const all = this.pieces();
    const sergeants = all.filter(isSergeant);
    if (sergeants.length === 0) {
      this.clearEchoes();
      this.lastPulse = { origins: [], contacts: 0 };
      return;
    }
    const origins = sergeants.map(s => this.toMini(s.pos.c, s.pos.r));
    const sweepMs = ringDurationMs(intervalMs);
    for (const o of origins) this.spawnRing(o.x, o.y, sweepMs);

    const maxPx = Math.hypot(this.miniMapWidth, this.miniMapHeight);
    const threats = all.filter(p => p.alive && (p.kind === 'stealer' || p.kind === 'blip'));
    const seen = new Set<string>();
    for (const t of threats) {
      seen.add(t.id);
      const at = this.toMini(t.pos.c, t.pos.r);
      const dist = Math.min(...origins.map(o => Math.hypot(o.x - at.x, o.y - at.y)));
      const { delayMs, fadeMs } = pulseTimings(dist, maxPx, intervalMs);
      let img = this.echoes.get(t.id);
      if (!img) {
        // One image per contact for its lifetime — repositioned every pulse,
        // never recreated (ISC-697).
        img = this.scene.add.image(at.x, at.y, t.kind === 'stealer' ? 'echo_stealer' : 'echo_blip')
          .setAlpha(0);
        const size = t.kind === 'stealer' ? RADAR.stealerSizePx : RADAR.blipSizePx;
        img.setDisplaySize(size, size);
        this.echoLayer.add(img);
        this.echoes.set(t.id, img);
      }
      img.setPosition(at.x, at.y);
      this.scene.tweens.killTweensOf(img);
      img.setAlpha(0);
      this.scene.tweens.add({
        targets: img,
        alpha: echoAlpha(t.kind),
        delay: delayMs,
        duration: RADAR.fadeInMs,
        onComplete: () => {
          this.scene.tweens.add({ targets: img, alpha: 0, duration: fadeMs, ease: 'Sine.easeIn' });
        },
      });
    }
    // A contact that died or converted between pulses drops off the scope.
    for (const [id, img] of this.echoes) {
      if (seen.has(id)) continue;
      this.scene.tweens.killTweensOf(img);
      img.destroy();
      this.echoes.delete(id);
    }
    this.lastPulse = {
      origins: sergeants.map(s => ({ x: s.pos.c, y: s.pos.r })),
      contacts: threats.length,
    };
  }

  private spawnRing(x: number, y: number, durationMs: number): void {
    const ring = { x, y, t: 0 };
    this.rings.push(ring);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: durationMs,
      onUpdate: tween => { ring.t = tween.getValue() ?? 1; },
      onComplete: () => { this.rings = this.rings.filter(r => r !== ring); },
    });
  }

  private clearEchoes(): void {
    for (const img of this.echoes.values()) {
      this.scene.tweens.killTweensOf(img);
      img.destroy();
    }
    this.echoes.clear();
  }
}
