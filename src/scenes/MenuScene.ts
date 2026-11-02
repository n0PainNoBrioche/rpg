import Phaser from "phaser";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../core/Game";
import { SaveManager } from "../core/SaveManager";
import { createCityBackdrop } from "../ui/CityBackdrop";
import { MenuList } from "../ui/MenuList";
import { COLORS, pixelText } from "../ui/pixelText";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    createCityBackdrop(this);

    pixelText(this, W / 2, 40, "L'AVENTURE DE", 8);
    const title = pixelText(this, W / 2, 68, "SACHA / LÉA", 24, COLORS.matcha).setShadow(2, 2, "#15102e", 0, false, true);
    title.y = -30;
    this.tweens.add({ targets: title, y: 68, duration: 600, ease: "Bounce.easeOut" });

    const menu = new MenuList(
      this,
      W / 2,
      130,
      [
        { label: "Nouvelle partie", onSelect: () => this.scene.start("CharacterSelectionScene") },
        { label: "Charger une partie", disabled: true, onSelect: () => this.scene.start("SaveSlotsScene") },
      ],
      { lineHeight: 22 },
    );

    const status = pixelText(this, W / 2, H - 14, "Connexion au serveur de sauvegarde...", 8, COLORS.grey);
    SaveManager.list()
      .then((saves) => {
        if (!this.sys.isActive()) return;
        menu.setDisabled(1, saves.length === 0);
        status.setText(saves.length === 0 ? "Aucune sauvegarde" : `${saves.length} sauvegarde(s) disponible(s)`);
      })
      .catch((err: Error) => {
        if (!this.sys.isActive()) return;
        status.setText(err.message).setColor(COLORS.red);
      });
  }
}
