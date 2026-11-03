import Phaser from "phaser";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../core/constants";
import { gameState } from "../core/GameState";
import { SaveManager } from "../core/SaveManager";
import { audio } from "../audio/AudioManager";
import { levelRegistry } from "../levels/levelRegistry";
import { MenuList } from "../ui/MenuList";
import { COLORS, FONT, pixelText } from "../ui/pixelText";

/** Fin de partie : aucune sauvegarde n'est écrite, le joueur peut recommencer le niveau. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: { variant: "feur" | "defeat"; levelId: string }): void {
    const feur = data.variant === "feur";
    this.cameras.main.setBackgroundColor("#000000");
    audio.stopMusic();
    audio.playMusic("gameover");

    const letters = "GAME OVER".split("");
    const startX = W / 2 - (letters.length * 24) / 2 + 12;
    letters.forEach((ch, i) => {
      if (ch === " ") return;
      const t = this.add
        .text(startX + i * 24, -30, ch, { fontFamily: FONT, fontSize: "24px", color: COLORS.red, stroke: "#2a1a26", strokeThickness: 4 })
        .setOrigin(0.5);
      this.tweens.add({ targets: t, y: 70, duration: 520, delay: 200 + i * 110, ease: "Bounce.easeOut" });
    });

    const hero = this.add.image(W / 2, -40, "hero").setScale(3);
    this.tweens.add({ targets: hero, y: 164, angle: 720 + 180, duration: 900, delay: 1300, ease: "Bounce.easeOut", onComplete: () => this.stars(hero.x, hero.y - 48) });

    const sub = pixelText(this, W / 2, 100, feur ? "Clément a eu le dernier mot." : "Les taxes ont gagné cette fois.", 8, COLORS.grey).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, delay: 2300, duration: 500 });

    this.time.delayedCall(2600, () => {
      pixelText(this, W / 2, H - 14, "Cette partie n'a pas été sauvegardée.", 8, COLORS.grey);
      const status = pixelText(this, W / 2, 200, "", 8, COLORS.red);
      const menu: MenuList = new MenuList(
        this,
        W / 2,
        218,
        [
          {
            label: "Recommencer le niveau",
            onSelect: () => {
              const save = gameState.save;
              const level = levelRegistry[data.levelId];
              if (!save || !level) return this.scene.start("MenuScene");
              menu.lock(true);
              SaveManager.startLevel(save.id, data.levelId)
                .then(({ token }) => {
                  gameState.levelSession = { levelId: data.levelId, token };
                  this.scene.start(level.sceneKey, { levelId: data.levelId });
                })
                .catch((err: Error) => {
                  status.setText(err.message);
                  menu.lock(false);
                });
            },
          },
          { label: "Menu principal", onSelect: () => this.scene.start("MenuScene") },
        ],
        { lineHeight: 18 },
      );
    });
  }

  /** Étoiles qui tournent autour de l'héroïne assommée. */
  private stars(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const s = this.add.image(x, y, "spark").setScale(3);
      const a0 = (i / 3) * Math.PI * 2;
      this.tweens.addCounter({
        from: 0,
        to: Math.PI * 2,
        duration: 1400,
        repeat: -1,
        onUpdate: (tw) => s.setPosition(x + Math.cos(a0 + tw.getValue()!) * 22, y + Math.sin(a0 + tw.getValue()!) * 6),
      });
    }
  }
}
