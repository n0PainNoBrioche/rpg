import Phaser from "phaser";
import { bakeAllSprites } from "../art/sprites";
import { bakeProps } from "../art/props";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  async create(): Promise<void> {
    try {
      await Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('24px "Press Start 2P"')]);
    } catch {
      /* police de secours : monospace */
    }
    bakeAllSprites(this);
    bakeProps(this);
    this.scene.launch("AudioOverlayScene");
    this.scene.start("MenuScene");
  }
}
