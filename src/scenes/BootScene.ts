import Phaser from "phaser";
import { bakeHero } from "../art/hero";

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
    bakeHero(this);
    this.scene.start("MenuScene");
  }
}
