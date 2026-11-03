import Phaser from "phaser";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../core/constants";
import { FONT } from "./pixelText";

/** Boutons tactiles (gauche / droite / action), affichés uniquement sur écran tactile. */
export class MobileControls {
  left = false;
  right = false;
  private actionQueued = false;
  private objects: Array<Phaser.GameObjects.Arc | Phaser.GameObjects.Text> = [];
  readonly enabled: boolean;

  constructor(scene: Phaser.Scene) {
    this.enabled = scene.sys.game.device.input.touch || new URLSearchParams(location.search).has("touch");
    if (!this.enabled) return;
    scene.input.addPointer(2);
    this.button(scene, 36, H - 34, "<", (v) => (this.left = v));
    this.button(scene, 92, H - 34, ">", (v) => (this.right = v));
    this.button(scene, W - 40, H - 34, "A", (v) => {
      if (v) this.actionQueued = true;
    });
  }

  private button(scene: Phaser.Scene, x: number, y: number, label: string, set: (down: boolean) => void): void {
    const circle = scene.add.circle(x, y, 20, 0xf4efc8, 0.18).setStrokeStyle(2, 0xf4efc8, 0.5).setScrollFactor(0).setDepth(90);
    const text = scene.add.text(x, y, label, { fontFamily: FONT, fontSize: "16px", color: "#f4efc8" }).setOrigin(0.5).setScrollFactor(0).setDepth(91).setAlpha(0.8);
    circle.setInteractive();
    circle.on("pointerdown", () => {
      set(true);
      circle.setFillStyle(0xa8d86a, 0.4);
    });
    const release = () => {
      set(false);
      circle.setFillStyle(0xf4efc8, 0.18);
    };
    circle.on("pointerup", release);
    circle.on("pointerout", release);
    this.objects.push(circle, text);
  }

  setVisible(v: boolean): void {
    this.objects.forEach((o) => o.setVisible(v));
    if (!v) {
      this.left = false;
      this.right = false;
    }
  }

  /** Vrai une seule fois par appui sur le bouton d'action. */
  consumeAction(): boolean {
    const v = this.actionQueued;
    this.actionQueued = false;
    return v;
  }
}
