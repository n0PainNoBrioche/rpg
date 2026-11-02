import Phaser from "phaser";
import { COLORS, FONT } from "./pixelText";

export interface MenuItem {
  label: string;
  disabled?: boolean;
  onSelect: () => void;
}

export interface MenuListOptions {
  lineHeight?: number;
  align?: "center" | "left";
  fontSize?: number;
}

/** Liste de choix navigable au clavier (haut/bas + entrée), à la souris et au toucher. */
export class MenuList {
  private index = 0;
  private labels: Phaser.GameObjects.Text[] = [];
  private cursor: Phaser.GameObjects.Text;
  private disabled: boolean[];
  private locked = false;
  private readonly onKey: (e: KeyboardEvent) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly items: MenuItem[],
    opts: MenuListOptions = {},
  ) {
    const lh = opts.lineHeight ?? 20;
    const size = opts.fontSize ?? 8;
    const left = opts.align === "left";
    this.disabled = items.map((i) => !!i.disabled);

    items.forEach((item, i) => {
      const t = scene.add
        .text(x, y + i * lh, item.label, { fontFamily: FONT, fontSize: `${size}px`, color: COLORS.cream })
        .setOrigin(left ? 0 : 0.5, 0.5)
        .setShadow(1, 1, "#000000", 0, false, true);
      t.setInteractive(new Phaser.Geom.Rectangle(-24, -8, t.width + 48, t.height + 16), Phaser.Geom.Rectangle.Contains);
      t.on("pointerover", () => this.setIndex(i));
      t.on("pointerdown", () => {
        this.setIndex(i);
        this.activate();
      });
      this.labels.push(t);
    });

    this.cursor = scene.add.text(0, 0, ">", { fontFamily: FONT, fontSize: `${size}px`, color: COLORS.matcha }).setOrigin(0.5);
    this.index = Math.max(0, this.disabled.findIndex((d) => !d));
    this.refresh();

    this.onKey = (e) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") this.move(-1);
      else if (e.code === "ArrowDown" || e.code === "KeyS") this.move(1);
      else if (e.code === "Enter" || e.code === "Space" || e.code === "KeyZ") this.activate();
    };
    scene.input.keyboard?.on("keydown", this.onKey);
    scene.events.once("shutdown", () => scene.input.keyboard?.off("keydown", this.onKey));
  }

  setDisabled(i: number, value: boolean): void {
    this.disabled[i] = value;
    if (this.disabled[this.index]) this.move(1);
    this.refresh();
  }

  /** Bloque la navigation (ex. pendant un appel réseau). */
  lock(value: boolean): void {
    this.locked = value;
  }

  private setIndex(i: number): void {
    if (this.locked || this.disabled[i]) return;
    this.index = i;
    this.refresh();
  }

  private move(delta: number): void {
    if (this.locked) return;
    const n = this.items.length;
    for (let step = 1; step <= n; step++) {
      const j = (this.index + delta * step + n * step) % n;
      if (!this.disabled[j]) {
        this.index = j;
        break;
      }
    }
    this.refresh();
  }

  private activate(): void {
    if (this.locked || this.disabled[this.index]) return;
    this.items[this.index].onSelect();
  }

  private refresh(): void {
    this.labels.forEach((t, i) => {
      t.setColor(this.disabled[i] ? COLORS.grey : i === this.index ? COLORS.matcha : COLORS.cream);
    });
    const sel = this.labels[this.index];
    if (sel) this.cursor.setPosition(sel.x - sel.displayWidth * sel.originX - 10, sel.y);
  }
}
