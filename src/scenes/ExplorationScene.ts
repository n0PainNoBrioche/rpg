import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/Game";
import { gameState } from "../core/GameState";
import { SaveManager } from "../core/SaveManager";
import { HERO_TEXTURE } from "../art/hero";
import { createCityBackdrop } from "../ui/CityBackdrop";
import { MenuList, type MenuItem } from "../ui/MenuList";
import { COLORS, drawPanel, pixelText } from "../ui/pixelText";

/** Scène du niveau. Étape 3 : déplacements, dialogues et événements à venir. */
export class ExplorationScene extends Phaser.Scene {
  constructor() {
    super("ExplorationScene");
  }

  create(): void {
    createCityBackdrop(this);
    const hero = this.add.image(W / 2, 204, HERO_TEXTURE).setScale(2);
    this.tweens.add({ targets: hero, y: 206, duration: 500, yoyo: true, repeat: -1, ease: "Stepped" });
    drawPanel(this, 60, 40, W - 120, 70);
    pixelText(this, W / 2, 62, "Niveau 1 : La taxe du matcha", 8, COLORS.matcha);
    pixelText(this, W / 2, 84, "Déplacements et dialogues : étape 3", 8, COLORS.grey);
    const status = pixelText(this, W / 2, 130, "", 8, COLORS.red);

    const items: MenuItem[] = [{ label: "Retour aux niveaux", onSelect: () => this.scene.start("LevelSelectScene") }];
    if (import.meta.env.DEV) {
      // Outil de développement : teste la validation serveur avant que la fin du niveau existe.
      items.unshift({
        label: "[dev] Valider le niveau",
        onSelect: () => {
          const save = gameState.save;
          const session = gameState.levelSession;
          if (!save || !session) return;
          SaveManager.completeLevel(save.id, session.levelId, session.token)
            .then((updated) => {
              gameState.save = updated;
              this.scene.start("LevelSelectScene");
            })
            .catch((err: Error) => status.setText(err.message));
        },
      });
    }
    new MenuList(this, W / 2, 160, items, { lineHeight: 22 });
  }
}
