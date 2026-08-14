import Phaser from 'phaser'
import { PieceEvents } from '@sulk/engine/index.js'
import { HUD_WIDTH, HUD_BG, HUD_HEADER_COLOR, HUD_TEXT_COLOR, MINI_MAP_MARGIN } from '../config.js'

export class HudPanel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle
  private apText: Phaser.GameObjects.Text
  private miniMap: Phaser.GameObjects.Container
  private currentId: string | null = null
  private casualtyText!: Phaser.GameObjects.Text
  private kills = 0
  private losses = 0

  constructor(scene: Phaser.Scene, miniMap: Phaser.GameObjects.Container) {
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
    const headerText = scene.add.text(header.x + 8, header.y + 6, 'Marine Info', {
      fontFamily: 'Kanit',
      fontSize: '20px',
      color: HUD_TEXT_COLOR,
      fontStyle: 'bold',
      align: 'left',
      fixedWidth: HUD_WIDTH - 16
    })
    this.add(headerText)

    // AP text
    this.apText = scene.add.text(header.x + 8, header.y + 38, 'AP: --/--', {
      fontFamily: 'Kanit',
      fontSize: '18px',
      color: HUD_TEXT_COLOR,
      align: 'left',
      fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.apText)

    // Casualty counters
    this.casualtyText = scene.add.text(header.x + 8, header.y + 70, 'Kills: 0   Losses: 0', {
      fontFamily: 'Kanit',
      fontSize: '15px',
      color: HUD_TEXT_COLOR,
      align: 'left',
      fixedWidth: HUD_WIDTH - 16
    })
    this.add(this.casualtyText)
    PieceEvents.on('pieceDied', ({ kind }) => {
      if (kind === 'marine') this.losses += 1
      else this.kills += 1
      this.casualtyText.setText(`Kills: ${this.kills}   Losses: ${this.losses}`)
    })

    // subscribe — payloads carry everything; the HUD never reaches into the engine
    PieceEvents.on('selected', ({ pieceId, ap }) => {
      this.currentId = pieceId
      if (!pieceId || !ap) {
        this.apText.setText('AP: --/--')
        return
      }
      this.setAP(ap.apRemaining, ap.apInitial)
    })
    PieceEvents.on('apChanged', ({ pieceId, apRemaining, apInitial }) => {
      if (pieceId === this.currentId) this.setAP(apRemaining, apInitial)
    })
  }

  private setAP(rem: number, init: number) {
    this.apText.setText(`AP: ${rem}/${init}`)
  }
}
