import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/constants";
import { gameState } from "../core/GameState";
import { ApiError, SaveManager } from "../core/SaveManager";
import { audio } from "../audio/AudioManager";
import { LEVELS, getNextLevelId } from "../../shared/levels";
import { createCityBackdrop } from "../ui/CityBackdrop";
import { MenuList, type MenuItem } from "../ui/MenuList";
import { COLORS, drawPanel, pixelText } from "../ui/pixelText";

/** Niveau terminé : le serveur valide la progression, débloque le niveau suivant et sauvegarde. */
export class LevelCompleteScene extends Phaser.Scene {
  private levelId = "";
  private status!: Phaser.GameObjects.Text;
  private menu: MenuList | null = null;

  constructor() {
    super("LevelCompleteScene");
  }

  init(data: { levelId: string }): void {
    this.levelId = data.levelId;
  }

  create(): void {
    createCityBackdrop(this);
    audio.stopMusic();
    audio.playMusic("levelcomplete");
    drawPanel(this, 60, 40, W - 120, 170);
    const n = LEVELS.findIndex((l) => l.id === this.levelId) + 1;
    const title = pixelText(this, W / 2, 78, `NIVEAU ${n} TERMINÉ !`, 16, COLORS.green).setScale(0.2);
    this.tweens.add({ targets: title, scale: 1, duration: 450, ease: "Back.easeOut" });
    pixelText(this, W / 2, 104, LEVELS[n - 1]?.name ?? "", 8, COLORS.cream);
    this.confetti();
    this.status = pixelText(this, W / 2, 134, "Sauvegarde en cours...", 8, COLORS.grey);
    void this.save();
  }

  private async save(): Promise<void> {
    const save = gameState.save;
    const session = gameState.levelSession;
    this.menu?.destroy();
    this.menu = null;
    if (!save || !session || session.levelId !== this.levelId) {
      this.fail("Session de niveau introuvable : relance le niveau.");
      return;
    }
    this.status.setText("Sauvegarde en cours...").setColor(COLORS.grey);
    try {
      gameState.save = await SaveManager.completeLevel(save.id, this.levelId, session.token);
      gameState.levelSession = null;
      this.status.setText("Progression sauvegardée.").setColor(COLORS.green);
      const next = getNextLevelId(this.levelId);
      if (next) pixelText(this, W / 2, 154, `Niveau ${LEVELS.findIndex((l) => l.id === next) + 1} débloqué !`, 8, COLORS.cream);
      this.menu = new MenuList(
        this,
        W / 2,
        184,
        [
          { label: "Choisir un niveau", onSelect: () => this.scene.start("LevelSelectScene") },
          { label: "Menu principal", onSelect: () => this.scene.start("MenuScene") },
        ],
        { lineHeight: 18 },
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur inconnue.";
      this.fail(msg, err instanceof ApiError && err.status === 0);
    }
  }

  private fail(message: string, canRetry = true): void {
    this.status.setText(message).setColor(COLORS.red);
    const items: MenuItem[] = [];
    if (canRetry) items.push({ label: "Réessayer", onSelect: () => void this.save() });
    items.push({ label: "Menu principal", onSelect: () => this.scene.start("MenuScene") });
    this.menu = new MenuList(this, W / 2, 170, items, { lineHeight: 18 });
  }

  private confetti(): void {
    const colors = [0xa8d86a, 0xf2c14e, 0xe8475a, 0x7ab8ff, 0xff7aa8];
    for (let i = 0; i < 50; i++) {
      const r = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(-120, -4), 4, 4, colors[i % colors.length]).setDepth(200);
      this.tweens.add({
        targets: r,
        y: 280,
        x: r.x + Phaser.Math.Between(-30, 30),
        angle: 360,
        duration: Phaser.Math.Between(1800, 3200),
        delay: Phaser.Math.Between(0, 1400),
        repeat: -1,
        onRepeat: () => r.setY(-8),
      });
    }
  }
}
