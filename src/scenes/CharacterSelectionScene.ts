import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/constants";
import { gameState } from "../core/GameState";
import { SaveManager } from "../core/SaveManager";
import { CHARACTER_NAMES, type CharacterName } from "../../shared/types";
import { createCityBackdrop } from "../ui/CityBackdrop";
import { COLORS, drawPanel, pixelText } from "../ui/pixelText";

export class CharacterSelectionScene extends Phaser.Scene {
  private selected = 0;
  private busy = false;
  private cards: Phaser.GameObjects.Graphics[] = [];
  private heroes: Phaser.GameObjects.Image[] = [];
  private status!: Phaser.GameObjects.Text;
  private onKey!: (e: KeyboardEvent) => void;

  constructor() {
    super("CharacterSelectionScene");
  }

  create(): void {
    this.selected = 0;
    this.busy = false;
    this.cards = [];
    this.heroes = [];
    createCityBackdrop(this);
    drawPanel(this, 24, 14, W - 48, 242);
    pixelText(this, W / 2, 34, "Choisis ton prénom", 8, COLORS.green);

    CHARACTER_NAMES.forEach((name, i) => {
      const cx = 150 + i * 180;
      const card = this.add.graphics();
      this.cards.push(card);
      const hero = this.add.image(cx, 108, "hero").setScale(4).setOrigin(0.5, 0.5);
      this.heroes.push(hero);
      this.tweens.add({ targets: hero, y: 112, duration: 500, yoyo: true, repeat: -1, ease: "Stepped" });
      // arc : trois traits, repris par la même couleur que les bottes
      const bow = this.add.graphics();
      bow.lineStyle(3, 0x6b4423).beginPath().arc(cx + 44, 108, 34, -1.1, 1.1).strokePath();
      bow.lineStyle(1, 0xf4efc8).lineBetween(cx + 44 + 34 * Math.cos(-1.1), 108 + 34 * Math.sin(-1.1), cx + 44 + 34 * Math.cos(1.1), 108 + 34 * Math.sin(1.1));
      pixelText(this, cx, 170, name, 8);
      const zone = this.add.zone(cx, 120, 140, 130).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this.select(i));
    });

    pixelText(this, W / 2, 196, "C'est la même aventurière : seul le prénom change.", 8, COLORS.grey);
    const confirm = pixelText(this, W / 2, 222, "Commencer", 8, COLORS.green);
    confirm.setInteractive(new Phaser.Geom.Rectangle(-30, -10, confirm.width + 60, confirm.height + 20), Phaser.Geom.Rectangle.Contains);
    confirm.on("pointerdown", () => this.confirm());
    const back = pixelText(this, 52, 34, "Retour", 8, COLORS.grey).setOrigin(0.5);
    back.setInteractive(new Phaser.Geom.Rectangle(-16, -12, back.width + 32, back.height + 24), Phaser.Geom.Rectangle.Contains);
    back.on("pointerdown", () => this.scene.start("MenuScene"));
    this.status = pixelText(this, W / 2, 242, "", 8, COLORS.red);

    this.onKey = (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.select(0);
      else if (e.code === "ArrowRight" || e.code === "KeyD") this.select(1);
      else if (e.code === "Enter" || e.code === "Space") this.confirm();
      else if (e.code === "Escape") this.scene.start("MenuScene");
    };
    this.input.keyboard?.on("keydown", this.onKey);
    this.events.once("shutdown", () => this.input.keyboard?.off("keydown", this.onKey));
    this.select(0);
  }

  private select(i: number): void {
    if (this.busy) return;
    this.selected = i;
    this.cards.forEach((g, k) => {
      const cx = 150 + k * 180;
      g.clear();
      g.fillStyle(k === i ? 0x31236a : 0x1a1340, 1).fillRect(cx - 70, 54, 140, 130);
      g.lineStyle(2, k === i ? 0xa8d86a : 0x4a3f7a).strokeRect(cx - 70, 54, 140, 130);
    });
  }

  private confirm(): void {
    if (this.busy) return;
    this.busy = true;
    const character: CharacterName = CHARACTER_NAMES[this.selected];
    this.status.setText("Création de la sauvegarde...").setColor(COLORS.grey);
    SaveManager.create(character)
      .then((save) => {
        gameState.save = save;
        this.scene.start("LevelSelectScene");
      })
      .catch((err: Error) => {
        this.busy = false;
        this.status.setText(err.message).setColor(COLORS.red);
      });
  }
}
