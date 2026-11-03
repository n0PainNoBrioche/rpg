import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/constants";
import { audio } from "../audio/AudioManager";
import { COLORS, FONT } from "./pixelText";
import { MenuList } from "./MenuList";

export interface DialogueLine {
  speaker?: string;
  text: string;
  /** « shake » : le texte tremble (propos incompréhensibles). */
  effect?: "shake";
}
export interface SpeakerDef {
  /** « @hero » est remplacé par le prénom choisi. */
  name: string;
  portrait?: string;
}
export interface DialogueFile {
  speakers: Record<string, SpeakerDef>;
  scenes: Record<string, DialogueLine[]>;
}

/** Boîte en haut de l'écran : elle ne cache ni l'héroïne ni les personnages au sol. */
const BOX = { x: 8, y: 8, w: W - 16, h: 76 };
const CHAR_DELAY = 22;

/** Fenêtre de dialogue de style JRPG : portrait, nom, texte progressif, choix. */
export class DialogueBox {
  private root: Phaser.GameObjects.Container;
  private nameText: Phaser.GameObjects.Text;
  private body: Phaser.GameObjects.Text;
  private portrait: Phaser.GameObjects.Image;
  private portraitFrame: Phaser.GameObjects.Graphics;
  private arrow: Phaser.GameObjects.Text;
  private typing: Phaser.Time.TimerEvent | null = null;
  private shakeTimer: Phaser.Time.TimerEvent | null = null;
  private fullText = "";
  private onAdvance: (() => void) | null = null;
  private choosing = false;
  private readonly keyHandler: (e: KeyboardEvent) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly speakers: Record<string, SpeakerDef>,
    private readonly heroName: string,
  ) {
    const bg = scene.add.graphics();
    bg.fillStyle(0x0f0a26, 0.94).fillRect(BOX.x, BOX.y, BOX.w, BOX.h);
    bg.lineStyle(2, 0xf4efc8).strokeRect(BOX.x + 1, BOX.y + 1, BOX.w - 2, BOX.h - 2);
    this.portraitFrame = scene.add.graphics();
    this.portraitFrame.fillStyle(0x31236a).fillRect(BOX.x + 8, BOX.y + 10, 56, 54);
    this.portraitFrame.lineStyle(2, 0x4a3f7a).strokeRect(BOX.x + 8, BOX.y + 10, 56, 54);
    this.portrait = scene.add.image(BOX.x + 36, BOX.y + 37, "portrait_hero").setScale(3.4).setVisible(false);
    this.nameText = scene.add.text(BOX.x + 76, BOX.y + 10, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.green });
    this.body = scene.add.text(BOX.x + 76, BOX.y + 26, "", {
      fontFamily: FONT,
      fontSize: "8px",
      color: COLORS.cream,
      lineSpacing: 6,
      wordWrap: { width: BOX.w - 96, useAdvancedWrap: true },
    });
    this.arrow = scene.add.text(BOX.x + BOX.w - 16, BOX.y + BOX.h - 14, "v", { fontFamily: FONT, fontSize: "8px", color: COLORS.green }).setVisible(false);
    scene.tweens.add({ targets: this.arrow, y: this.arrow.y + 3, duration: 300, yoyo: true, repeat: -1 });
    this.root = scene.add.container(0, 0, [bg, this.portraitFrame, this.portrait, this.nameText, this.body, this.arrow]);
    this.root.setScrollFactor(0).setDepth(100).setVisible(false);

    this.keyHandler = (e) => {
      if (e.repeat) return;
      if (e.code === "Enter" || e.code === "Space" || e.code === "KeyZ") this.advance();
    };
    scene.input.keyboard?.on("keydown", this.keyHandler);
    scene.input.on("pointerdown", () => this.advance());
    scene.events.once("shutdown", () => scene.input.keyboard?.off("keydown", this.keyHandler));
  }

  get active(): boolean {
    return this.root.visible;
  }

  /** Joue une suite de répliques ; se résout quand la dernière est validée. */
  async play(lines: DialogueLine[]): Promise<void> {
    this.root.setVisible(true);
    for (const line of lines) await this.showLine(line);
    this.root.setVisible(false);
  }

  /** Affiche une liste de choix ; renvoie l'index choisi. */
  choose(labels: string[]): Promise<number> {
    return new Promise((resolve) => {
      this.root.setVisible(true);
      this.nameText.setText("");
      this.body.setText("");
      this.portraitFrame.setVisible(false);
      this.portrait.setVisible(false);
      this.arrow.setVisible(false);
      this.choosing = true;
      const menu = new MenuList(
        this.scene,
        BOX.x + 40,
        BOX.y + 26,
        labels.map((label, i) => ({
          label,
          onSelect: () => {
            audio.playSfx("select");
            menu.destroy();
            this.choosing = false;
            this.portraitFrame.setVisible(true);
            this.root.setVisible(false);
            resolve(i);
          },
        })),
        { align: "left", lineHeight: 20, depth: 101, scrollFactor0: true },
      );
    });
  }

  private resolveName(name: string): string {
    return name.replace("@hero", this.heroName);
  }

  private showLine(line: DialogueLine): Promise<void> {
    return new Promise((resolve) => {
      const sp = line.speaker ? this.speakers[line.speaker] : undefined;
      this.nameText.setText(sp ? this.resolveName(sp.name) : "");
      if (sp?.portrait) {
        this.portrait.setTexture(sp.portrait).setVisible(true);
        this.portraitFrame.setVisible(true);
      } else {
        this.portrait.setVisible(false);
        this.portraitFrame.setVisible(false);
      }
      this.fullText = line.text.replace(/@hero/g, this.heroName);
      this.body.setText("");
      this.arrow.setVisible(false);
      this.shakeTimer?.remove();
      this.shakeTimer = null;
      if (line.effect === "shake") {
        this.shakeTimer = this.scene.time.addEvent({
          delay: 60,
          loop: true,
          callback: () => this.body.setPosition(BOX.x + 76 + Phaser.Math.Between(-1, 1), BOX.y + 26 + Phaser.Math.Between(-1, 1)),
        });
      } else {
        this.body.setPosition(BOX.x + 76, BOX.y + 26);
      }
      let i = 0;
      this.typing = this.scene.time.addEvent({
        delay: CHAR_DELAY,
        repeat: this.fullText.length - 1,
        callback: () => {
          i++;
          this.body.setText(this.fullText.slice(0, i));
          if (i % 2 === 0) audio.playSfx(line.speaker === "macron" ? "blip_low" : "blip");
          if (i >= this.fullText.length) this.finishTyping();
        },
      });
      this.onAdvance = () => {
        if (this.typing) {
          this.typing.remove();
          this.body.setText(this.fullText);
          this.finishTyping();
        } else {
          this.shakeTimer?.remove();
          this.shakeTimer = null;
          this.onAdvance = null;
          this.arrow.setVisible(false);
          resolve();
        }
      };
    });
  }

  private finishTyping(): void {
    this.typing = null;
    this.arrow.setVisible(true);
  }

  private advance(): void {
    if (!this.root.visible || this.choosing) return;
    this.onAdvance?.();
  }
}
