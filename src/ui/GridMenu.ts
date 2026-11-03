import Phaser from "phaser";
import { audio } from "../audio/AudioManager";
import { COLORS, FONT } from "./pixelText";

export interface GridItem<T> {
  label: string;
  value: T;
  disabled?: boolean;
  hint?: string;
}

export interface GridOptions<T> {
  colWidth: number;
  lineHeight: number;
  onPick: (item: GridItem<T>) => void;
  onCancel?: () => void;
  onHover?: (item: GridItem<T>) => void;
  depth?: number;
}

/** Menu en colonnes : haut/bas dans la colonne, gauche/droite entre colonnes, souris et toucher. */
export class GridMenu<T> {
  private col = 0;
  private row = 0;
  private texts: Phaser.GameObjects.Text[][] = [];
  private cursor: Phaser.GameObjects.Text;
  private readonly onKey: (e: KeyboardEvent) => void;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly columns: GridItem<T>[][],
    private readonly opts: GridOptions<T>,
  ) {
    columns.forEach((items, c) => {
      const col: Phaser.GameObjects.Text[] = [];
      items.forEach((item, r) => {
        const t = scene.add
          .text(x + c * opts.colWidth, y + r * opts.lineHeight, item.label, { fontFamily: FONT, fontSize: "8px", color: COLORS.cream })
          .setOrigin(0, 0.5)
          .setDepth(opts.depth ?? 60);
        t.setInteractive(new Phaser.Geom.Rectangle(-12, -(opts.lineHeight / 2) , opts.colWidth - 6, opts.lineHeight), Phaser.Geom.Rectangle.Contains);
        t.on("pointerover", () => this.focus(c, r));
        t.on("pointerdown", () => {
          this.focus(c, r);
          this.pick();
        });
        col.push(t);
      });
      this.texts.push(col);
    });
    this.cursor = scene.add.text(0, 0, ">", { fontFamily: FONT, fontSize: "8px", color: COLORS.green }).setOrigin(1, 0.5).setDepth(opts.depth ?? 60);
    this.col = Math.max(0, columns.findIndex((c) => c.length > 0));
    this.refresh();

    this.onKey = (e) => {
      if (e.repeat) return;
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          return this.move(0, -1);
        case "ArrowDown":
        case "KeyS":
          return this.move(0, 1);
        case "ArrowLeft":
        case "KeyA":
        case "KeyQ":
          return this.move(-1, 0);
        case "ArrowRight":
        case "KeyD":
          return this.move(1, 0);
        case "Enter":
        case "Space":
        case "KeyZ":
          return this.pick();
        case "Escape":
        case "Backspace":
        case "KeyX":
          if (opts.onCancel) {
            audio.playSfx("cancel");
            opts.onCancel();
          }
      }
    };
    scene.input.keyboard?.on("keydown", this.onKey);
    scene.events.once("shutdown", () => this.destroy());
  }

  private get current(): GridItem<T> | undefined {
    return this.columns[this.col]?.[this.row];
  }

  private focus(c: number, r: number): void {
    if (this.destroyed || (c === this.col && r === this.row)) return;
    this.col = c;
    this.row = r;
    audio.playSfx("move");
    this.refresh();
  }

  private move(dc: number, dr: number): void {
    if (this.destroyed) return;
    let c = this.col;
    let r = this.row;
    if (dc !== 0) {
      const n = this.columns.length;
      for (let step = 1; step <= n; step++) {
        const nc = (c + dc * step + n * step) % n;
        if (this.columns[nc].length > 0) {
          c = nc;
          r = Math.min(r, this.columns[nc].length - 1);
          break;
        }
      }
    } else {
      const len = this.columns[c].length;
      r = (r + dr + len) % len;
    }
    this.focus(c, r);
  }

  private pick(): void {
    const item = this.current;
    if (this.destroyed || !item) return;
    if (item.disabled) {
      audio.playSfx("cancel");
      return;
    }
    audio.playSfx("select");
    this.opts.onPick(item);
  }

  private refresh(): void {
    this.texts.forEach((col, c) =>
      col.forEach((t, r) => {
        const item = this.columns[c][r];
        t.setColor(item.disabled ? COLORS.grey : c === this.col && r === this.row ? COLORS.green : COLORS.cream);
      }),
    );
    const sel = this.texts[this.col]?.[this.row];
    if (sel) this.cursor.setPosition(sel.x - 2, sel.y);
    const item = this.current;
    if (item) this.opts.onHover?.(item);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.input.keyboard?.off("keydown", this.onKey);
    this.texts.flat().forEach((t) => t.destroy());
    this.cursor.destroy();
  }
}
