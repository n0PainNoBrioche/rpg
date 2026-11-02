import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/Game";
import { gameState } from "../core/GameState";
import { SaveManager } from "../core/SaveManager";
import { LEVELS } from "../../shared/levels";
import type { SaveSummary } from "../../shared/types";
import { createCityBackdrop } from "../ui/CityBackdrop";
import { MenuList } from "../ui/MenuList";
import { COLORS, drawPanel, pixelText } from "../ui/pixelText";

function levelLabel(id: string | null): string {
  if (!id) return "Aucun niveau";
  const n = LEVELS.findIndex((l) => l.id === id) + 1;
  return `Niveau ${n} validé`;
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export class SaveSlotsScene extends Phaser.Scene {
  constructor() {
    super("SaveSlotsScene");
  }

  create(): void {
    createCityBackdrop(this);
    drawPanel(this, 24, 28, W - 48, 214);
    pixelText(this, W / 2, 46, "Charger une partie", 8, COLORS.matcha);
    const info = pixelText(this, W / 2, 140, "Chargement...", 8, COLORS.grey);

    SaveManager.list()
      .then((saves) => {
        if (!this.sys.isActive()) return;
        info.destroy();
        this.showSaves(saves);
      })
      .catch((err: Error) => {
        if (!this.sys.isActive()) return;
        info.setText(err.message).setColor(COLORS.red);
        new MenuList(this, W / 2, 215, [{ label: "Retour", onSelect: () => this.scene.start("MenuScene") }]);
      });
  }

  private showSaves(saves: SaveSummary[]): void {
    const status = pixelText(this, W / 2, 226, "", 8, COLORS.red);
    const menu: MenuList = new MenuList(
      this,
      44,
      72,
      [
        ...saves.map((s) => ({
          label: `${s.pseudo.padEnd(5)} ${levelLabel(s.lastCompletedLevel).padEnd(15)} ${dateLabel(s.updatedAt)}`,
          onSelect: () => {
            menu.lock(true);
            SaveManager.load(s.id)
              .then((save) => {
                gameState.save = save;
                this.scene.start("LevelSelectScene");
              })
              .catch((err: Error) => {
                status.setText(err.message);
                menu.lock(false);
              });
          },
        })),
        { label: "Retour", onSelect: () => this.scene.start("MenuScene") },
      ],
      { align: "left", lineHeight: 22, fontSize: 8 },
    );
  }
}
