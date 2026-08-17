import Phaser from 'phaser'
import { PieceEvents } from '@sulk/engine/index.js'
import { HUD_WIDTH, HUD_BG, HUD_HEADER_COLOR, HUD_TEXT_COLOR, MINI_MAP_MARGIN, UI_FONT } from '../config.js'

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

  setTimer(seconds: number) {
    const m = Math.max(0, Math.floor(seconds / 60))
    const s = Math.max(0, seconds % 60)
    this.timerText.setText(`${m}:${String(s).padStart(2, '0')}`)
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
    // Mission-level information only: per-marine AP/CP/ammo live on the
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

    // Phase / turn / timer block
    const statusY = header.y + 62
    this.phaseText = scene.add.text(header.x + 8, statusY, 'Turn 1: Marines', {
      fontFamily: UI_FONT, fontSize: '15px', color: HUD_TEXT_COLOR, fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.phaseText)
    this.timerText = scene.add.text(header.x + 8, statusY + 22, '2:00', {
      fontFamily: UI_FONT, fontSize: '22px', color: '#e8c840', fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.timerText)

    // Done button
    const doneY = statusY + 62
    const doneBtn = scene.add.rectangle(8, doneY, HUD_WIDTH - 16, 34, 0x333333)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true })
    doneBtn.on('pointerdown', () => onDone?.())
    this.add(doneBtn)
    const doneLabel = scene.add.text(8, doneY + 6, 'DONE  ⏎', {
      fontFamily: UI_FONT, fontSize: '17px', color: '#ffffff', align: 'center', fixedWidth: HUD_WIDTH - 16
    })
    this.add(doneLabel)

    PieceEvents.on('phaseChanged', ({ phase, turn }) => {
      this.phaseText.setText(`Turn ${turn}: ${phase === 'MarineAction' ? 'Marines' : 'Stealers'}`)
    })

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
    this.objectiveText = scene.add.text(8, doneY + 44, '', {
      fontFamily: UI_FONT, fontSize: '13px', color: '#e8c840', lineSpacing: 2,
      fixedWidth: HUD_WIDTH - 16, wordWrap: { width: HUD_WIDTH - 16 }
    })
    this.add(this.objectiveText)

    // Dice readout — the original shows every roll on screen (DisplayDie)
    this.diceText = scene.add.text(8, doneY + 78, '', {
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
    this.statusText = scene.add.text(8, doneY + 96, '', {
      fontFamily: UI_FONT, fontSize: '14px', color: '#7ec8ff',
      fixedWidth: HUD_WIDTH - 16,
    })
    this.add(this.statusText)

    // Transient warning line (self-destruct confirm) — sits over the dice row
    this.flashText = scene.add.text(8, doneY + 78, '', {
      fontFamily: UI_FONT, fontSize: '14px', color: '#ff5544', fontStyle: 'bold',
      fixedWidth: HUD_WIDTH - 16,
    }).setVisible(false)
    this.add(this.flashText)

    // Map legend — mission-level; keyboard help lives in the roster panel
    const legend = scene.add.text(8, doneY + 114,
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
