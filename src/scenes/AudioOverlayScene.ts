import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/constants";
import { audio, VOLUME_STEPS } from "../audio/AudioManager";

/** Bouton de volume toujours visible (clic / toucher / touche M). */
export class AudioOverlayScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;

  constructor() {
    super("AudioOverlayScene");
  }

  create(): void {
    this.g = this.add.graphics().setDepth(1000);
    const zone = this.add.zone(W - 18, 14, 30, 24).setInteractive({ useHandCursor: true }).setDepth(1001);
    zone.on("pointerdown", () => {
      audio.cycleVolume();
      audio.playSfx("select");
      this.draw();
    });
    this.input.keyboard?.on("keydown", (e: KeyboardEvent) => {
      if (e.code === "KeyM" && !e.repeat) {
        audio.toggleMute();
        this.draw();
      }
    });
    this.draw();
  }

  private draw(): void {
    const g = this.g;
    g.clear();
    const x = W - 30;
    const y = 8;
    g.fillStyle(0x0f0a26, 0.7).fillRect(x - 3, y - 3, 30, 20);
    g.fillStyle(0xf4efc8).fillRect(x, y + 5, 4, 6).fillRect(x + 4, y + 3, 2, 10).fillRect(x + 6, y + 1, 2, 14);
    if (audio.muted) {
      g.lineStyle(2, 0xe8475a).lineBetween(x + 10, y + 3, x + 20, y + 13).lineBetween(x + 20, y + 3, x + 10, y + 13);
    } else {
      const level = VOLUME_STEPS.length - 1 - audio.volumeIndex;
      for (let i = 0; i < level; i++) g.fillStyle(0xa8d86a).fillRect(x + 11 + i * 4, y + 12 - i * 3 - 2, 2, 3 + i * 3);
    }
  }
}
