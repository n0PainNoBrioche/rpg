import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/constants";
import { gameState } from "../core/GameState";
import { SaveManager } from "../core/SaveManager";
import { LevelManager, type LevelStatus } from "../levels/LevelManager";
import { createCityBackdrop } from "../ui/CityBackdrop";
import { MenuList } from "../ui/MenuList";
import { COLORS, drawPanel, pixelText } from "../ui/pixelText";

const STATUS_LABEL: Record<LevelStatus, string> = {
  completed: "Terminé",
  available: "Disponible",
  soon: "Bientôt",
  locked: "Verrouillé",
};

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelectScene");
  }

  create(): void {
    const save = gameState.save;
    if (!save) {
      this.scene.start("MenuScene");
      return;
    }
    createCityBackdrop(this);
    drawPanel(this, 24, 28, W - 48, 214);
    pixelText(this, W / 2, 46, `Aventure de ${save.pseudo}`, 8, COLORS.green);
    const status = pixelText(this, W / 2, 226, "", 8, COLORS.red);

    const menu: MenuList = new MenuList(
      this,
      44,
      86,
      [
        ...LevelManager.entriesFor(save).map((entry, i) => ({
          label: `Niveau ${i + 1}  ${entry.meta.name.padEnd(20)} ${STATUS_LABEL[entry.status]}`,
          disabled: entry.status === "locked" || entry.status === "soon",
          onSelect: () => {
            if (!entry.definition) return;
            menu.lock(true);
            SaveManager.startLevel(save.id, entry.meta.id)
              .then(({ token }) => {
                gameState.levelSession = { levelId: entry.meta.id, token };
                this.scene.start(entry.definition!.sceneKey, { levelId: entry.meta.id });
              })
              .catch((err: Error) => {
                status.setText(err.message);
                menu.lock(false);
              });
          },
        })),
        { label: "Menu principal", onSelect: () => this.scene.start("MenuScene") },
      ],
      { align: "left", lineHeight: 26 },
    );
  }
}
