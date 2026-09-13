import Phaser from 'phaser'
import { PieceEvents, TUNING } from '@sulk/engine/index.js'
import { HUD_WIDTH, HUD_BG, HUD_HEADER_COLOR, HUD_TEXT_COLOR, MINI_MAP_MARGIN, UI_FONT } from '../config.js'

/** The command-time bar: full HUD width inside the 8px gutter, thin enough
 *  to sit under the button without pushing the legend off a short screen. */
const METER_W = HUD_WIDTH - 16
const METER_H = 8
/** Vertical room the meter takes from the rows below it (bar + readout). */
const METER_BLOCK = 34
/** One sergeant's block of command time: the dividers mark these. */
const METER_SEGMENT_MS = 10000
/** The floor below which Space will not open the pause. */
const METER_FLOOR_MS = 1000

export class HudPanel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle
  private miniMap: Phaser.GameObjects.Container
  private casualtyText!: Phaser.GameObjects.Text
  private phaseText!: Phaser.GameObjects.Text
  private timerText!: Phaser.GameObjects.Text
  private kills = 0
  private losses = 0
  /** VALUE-weighted stealer toll (blips count their hidden value) + mission quota. */
  private toll = 0
  private quota: number | undefined
  private objectiveText!: Phaser.GameObjects.Text
  private hoverText!: Phaser.GameObjects.Text
  private diceText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private flashText!: Phaser.GameObjects.Text
  private flashTimer?: Phaser.Time.TimerEvent
  private doneLabel!: Phaser.GameObjects.Text
  /** The command-time meter under the button: track, fill, the 10 s segment
   *  dividers, the 1 s floor mark and the readout line. */
  private meterTrack!: Phaser.GameObjects.Rectangle
  private meterFill!: Phaser.GameObjects.Rectangle
  private meterFloor!: Phaser.GameObjects.Rectangle
  private meterDividers: Phaser.GameObjects.Rectangle[] = []
  private meterText!: Phaser.GameObjects.Text
  private meterY = 0
  /** Cap the marks were last drawn for: a sergeant's death moves them. */
  private meterCapMs = -1
  /** Last recharge told to us, so the tick-by-tick refresh can pass two args. */
  private meterRechargeMs = 0

  /** Transient warning line (self-destruct confirm, etc.) — fades on its own. */
  flash(text: string, ms = 2000) {
    this.flashText.setText(text).setVisible(true)
    this.flashTimer?.remove()
    this.flashTimer = this.scene.time.delayedCall(ms, () => this.flashText.setVisible(false))
  }

  setObjective(text: string) {
    this.objectiveText.setText(text)
  }

  /** Kill-quota missions show the VALUE-weighted toll as `Kills: n/quota`. */
  setKillQuota(quota: number | undefined) {
    this.quota = quota
    this.renderCasualties()
  }

  /** Mission status line (escaped count, cleansed count, defend hold). */
  setStatus(text: string) {
    this.statusText.setText(text)
  }

  private renderCasualties() {
    const kills = this.quota !== undefined ? `${this.toll}/${this.quota}` : `${this.kills}`
    this.casualtyText.setText(`Kills: ${kills}   Losses: ${this.losses}`)
  }

  /** Coordinate + contents of the square under the cursor (below the controls). */
  setHoverInfo(text: string) {
    this.hoverText.setText(text || 'Hover a square for info')
  }

  /** Deployment clock (wall seconds). */
  setTimer(seconds: number) {
    const m = Math.max(0, Math.floor(seconds / 60))
    const s = Math.max(0, seconds % 60)
    this.timerText.setText(`${m}:${String(s).padStart(2, '0')}`)
  }

  /** The live clock: the cycle in progress and the seconds into it
   *  (TUNING.cycleTicks ticks of TUNING.tickMs). */
  setClock(tick: number, cycle: number) {
    const inCycle = tick % TUNING.cycleTicks
    const seconds = Math.floor(inCycle * TUNING.tickMs / 1000)
    this.phaseText.setText(`Cycle ${cycle}`)
    this.timerText.setText(`${seconds}s / ${Math.round(TUNING.cycleTicks * TUNING.tickMs / 1000)}s`)
  }

  /** Relabel the one button (START while deploying, COMMAND once live). */
  setPrimaryButton(label: string) {
    this.doneLabel.setText(label)
  }

  /** The command-time meter: seconds of pause banked against the cap. The bar
   *  is clamped to the cap, the text is not, because a dead sergeant lowers
   *  the cap while the time already banked stays spendable. The recharge is
   *  remembered so the per-tick refresh can pass the pool alone. */
  setPausePool(poolMs: number, capMs: number, rechargeMs?: number) {
    if (rechargeMs !== undefined) this.meterRechargeMs = Math.max(0, rechargeMs)
    const pool = Math.max(0, poolMs)
    const cap = Math.max(0, capMs)
    if (cap !== this.meterCapMs) this.drawMeterMarks(cap)
    this.meterTrack.setVisible(true)
    this.meterFill.setVisible(true)
    this.meterFloor.setVisible(cap > 0)
    for (const d of this.meterDividers) d.setVisible(true)
    const filled = cap > 0 ? Math.min(pool, cap) / cap : 0
    this.meterFill.setSize(Math.round(METER_W * filled), METER_H)
    const recharge = this.meterRechargeMs > 0
      ? `  +${Math.round(this.meterRechargeMs / 1000)} s/cycle` : ''
    this.meterText.setText(
      `Command time ${(pool / 1000).toFixed(1)} / ${Math.round(cap / 1000)} s${recharge}`)
  }

  /** `?pause=free`: the pause bills nothing, so the bar has nothing to show. */
  setPausePoolFree() {
    this.meterTrack.setVisible(false)
    this.meterFill.setVisible(false)
    this.meterFloor.setVisible(false)
    for (const d of this.meterDividers) d.setVisible(false)
    this.meterText.setText('Command time: FREE')
  }

  /** A divider every 10 s of cap so the sergeants' blocks are countable, plus
   *  a mark at the 1 s floor. Redrawn only when the cap moves. */
  private drawMeterMarks(capMs: number) {
    this.meterCapMs = capMs
    for (const d of this.meterDividers) d.destroy()
    this.meterDividers = []
    if (capMs <= 0) return
    for (let ms = METER_SEGMENT_MS; ms < capMs; ms += METER_SEGMENT_MS) {
      const divider = this.scene.add
        .rectangle(8 + Math.round(METER_W * ms / capMs), this.meterY, 1, METER_H, 0x000000, 0.5)
        .setOrigin(0)
      divider.setScrollFactor(0)
      this.meterDividers.push(divider)
      this.add(divider)
    }
    this.meterFloor.x = 8 + Math.round(METER_W * Math.min(METER_FLOOR_MS, capMs) / capMs)
  }

  /** Deploy-phase controls: an AUTO DEPLOY button that exists ONLY while the
   *  phase runs — it is destroyed outright on exit, leaving zero deploy UI. */
  private autoBtn?: Phaser.GameObjects.Rectangle
  private autoLabel?: Phaser.GameObjects.Text
  setDeployMode(on: boolean, onAuto?: () => void) {
    this.autoBtn?.destroy()
    this.autoLabel?.destroy()
    this.autoBtn = undefined
    this.autoLabel = undefined
    if (!on) return
    const scene = this.scene
    // Bottom-anchored: the objective, dice, status, and legend rows are all
    // populated before deployment starts — the button must cover none of them
    // (reviewer finding, 2026-08-19).
    const y = scene.scale.height - 42
    this.autoBtn = scene.add.rectangle(8, y, HUD_WIDTH - 16, 30, 0x2a4a2a)
      .setOrigin(0).setScrollFactor(0).setName('auto-deploy-btn')
      .setInteractive({ useHandCursor: true })
    this.autoBtn.on('pointerdown', () => onAuto?.())
    this.autoLabel = scene.add.text(8, y + 5, 'AUTO DEPLOY', {
      fontFamily: UI_FONT, fontSize: '16px', color: '#9fe89f', align: 'center', fixedWidth: HUD_WIDTH - 16
    }).setScrollFactor(0)
    this.add(this.autoBtn)
    this.add(this.autoLabel)
  }

  constructor(scene: Phaser.Scene, miniMap: Phaser.GameObjects.Container, onDone?: () => void) {
    super(scene, 0, 0)
    this.setScrollFactor(0) // stick to camera

    // background
    this.bg = scene.add.rectangle(0, 0, HUD_WIDTH, scene.scale.height, HUD_BG)
      .setOrigin(0)
    this.add(this.bg)

    // Mini-map re-parent
    this.miniMap = miniMap
    this.miniMap.setPosition(MINI_MAP_MARGIN, MINI_MAP_MARGIN)
    this.add(this.miniMap)

    // header strip
    const headerY = this.miniMap.y + (this.miniMap.height || 200) + MINI_MAP_MARGIN
    const header = scene.add.rectangle(0, headerY, HUD_WIDTH, 32, HUD_HEADER_COLOR).setOrigin(0)
    this.add(header)
    // Mission-level information only: per-marine AP and ammo live on the
    // roster cards, never here.
    const headerText = scene.add.text(header.x + 8, header.y + 6, 'Mission Status', {
      fontFamily: UI_FONT,
      fontSize: '20px',
      color: HUD_TEXT_COLOR,
      fontStyle: 'bold',
      align: 'left',
      fixedWidth: HUD_WIDTH - 16
    })
    this.add(headerText)

    // Cycle / clock block: the cycle in progress and the seconds into it.
    const statusY = header.y + 62
    this.phaseText = scene.add.text(header.x + 8, statusY, 'Cycle 1', {
      fontFamily: UI_FONT, fontSize: '15px', color: HUD_TEXT_COLOR, fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.phaseText)
    this.timerText = scene.add.text(header.x + 8, statusY + 22, '0s / 10s', {
      fontFamily: UI_FONT, fontSize: '22px', color: '#e8c840', fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.timerText)

    // The one button: COMMAND once the mission is live (START while deploying).
    const doneY = statusY + 62
    const doneBtn = scene.add.rectangle(8, doneY, HUD_WIDTH - 16, 34, 0x333333)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
    doneBtn.on('pointerdown', () => onDone?.())
    this.add(doneBtn)
    this.doneLabel = scene.add.text(8, doneY + 6, 'COMMAND  Space', {
      fontFamily: UI_FONT, fontSize: '17px', color: '#ffffff', align: 'center', fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.doneLabel)

    // The command-time meter, directly under the button: the bar in the
    // clock's yellow, dividers every sergeant's block, the floor mark where
    // the pause stops opening, and the honest numbers underneath.
    this.meterY = doneY + 42
    this.meterTrack = scene.add.rectangle(8, this.meterY, METER_W, METER_H, 0x2b2b2b).setOrigin(0)
    this.add(this.meterTrack)
    this.meterFill = scene.add.rectangle(8, this.meterY, METER_W, METER_H, 0xe8c840).setOrigin(0)
    this.add(this.meterFill)
    this.meterFloor = scene.add.rectangle(8, this.meterY - 2, 2, METER_H + 4, 0xffffff, 0.45).setOrigin(0)
    this.add(this.meterFloor)
    this.meterText = scene.add.text(8, this.meterY + METER_H + 3, 'Command time', {
      fontFamily: UI_FONT, fontSize: '12px', color: '#9aa89a', fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.meterText)

    PieceEvents.on('phaseChanged', ({ phase, turn }) => {
      this.phaseText.setText(phase === 'Deploy' ? 'DEPLOYMENT' : `Cycle ${turn}`)
    })
    PieceEvents.on('tick', ({ tick, cycle }) => this.setClock(tick, cycle))

    // Casualty counters
    this.casualtyText = scene.add.text(header.x + 8, header.y + 38, 'Kills: 0   Losses: 0', {
      fontFamily: UI_FONT,
      fontSize: '15px',
      color: HUD_TEXT_COLOR,
      align: 'left',
      fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.casualtyText)
    PieceEvents.on('pieceDied', ({ kind }) => {
      if (kind === 'marine') this.losses += 1
      else this.kills += 1
      this.renderCasualties()
    })
    // Kill-quota toll (original maction_end_script "N kills so far") — blips
    // credit their hidden VALUE, so this can outrun the piece-count tally.
    PieceEvents.on('casualtiesChanged', ({ casualties }) => {
      this.toll = casualties
      this.renderCasualties()
    })

    // Mission objective
    this.objectiveText = scene.add.text(8, doneY + 44 + METER_BLOCK, '', {
      fontFamily: UI_FONT, fontSize: '13px', color: '#e8c840', lineSpacing: 2,
      fixedWidth: HUD_WIDTH - 16, wordWrap: { width: HUD_WIDTH - 16 }
    })
    this.add(this.objectiveText)

    // Dice readout — the original shows every roll on screen (DisplayDie)
    this.diceText = scene.add.text(8, doneY + 78 + METER_BLOCK, '', {
      fontFamily: UI_FONT, fontSize: '13px', color: '#c8d8c8', fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.diceText)
    PieceEvents.on('shot', ({ rolls, hit }) => {
      this.diceText.setText(`Dice: ${rolls.join(' ')}${hit ? ' · KILL' : ''}`)
    })
    PieceEvents.on('closeCombat', ({ attackerRolls, defenderRolls }) => {
      this.diceText.setText(`CC: ${attackerRolls.join(' ')} vs ${defenderRolls.join(' ')}`)
    })

    // Controls reference + map legend
    this.statusText = scene.add.text(8, doneY + 96 + METER_BLOCK, '', {
      fontFamily: UI_FONT, fontSize: '14px', color: '#7ec8ff',
      fixedWidth: HUD_WIDTH - 16,
    })
    this.add(this.statusText)

    // Transient warning line (self-destruct confirm) — sits over the dice row
    this.flashText = scene.add.text(8, doneY + 78 + METER_BLOCK, '', {
      fontFamily: UI_FONT, fontSize: '14px', color: '#ff5544', fontStyle: 'bold',
      fixedWidth: HUD_WIDTH - 16,
    }).setVisible(false)
    this.add(this.flashText)

    // Map legend — mission-level; keyboard help lives in the roster panel
    const legend = scene.add.text(8, doneY + 114 + METER_BLOCK,
      'Map: ▲ = stealer entry\norange = objective · green = exit',
      { fontFamily: UI_FONT, fontSize: '12px', color: '#8a8a8a', lineSpacing: 3, fixedWidth: HUD_WIDTH - 16 })
    this.add(legend)

    // Hover readout — square coordinate + contents, below the map legend
    this.hoverText = scene.add.text(8, legend.y + legend.height + 10, 'Hover a square for info', {
      fontFamily: UI_FONT, fontSize: '13px', color: '#b8c6d8', lineSpacing: 2,
      fixedWidth: HUD_WIDTH - 16, wordWrap: { width: HUD_WIDTH - 16 }
    })
    this.add(this.hoverText)

    // Children default to scrollFactor 1: rendering follows the container (0),
    // but Phaser's input hit-test uses the child's own factor — set each child,
    // or the DONE button's clickable area drifts with the camera.
    this.list.forEach((child) => (child as Phaser.GameObjects.Components.ScrollFactor & typeof child).setScrollFactor?.(0))
  }
}
