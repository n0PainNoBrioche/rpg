import Phaser from "phaser";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../core/constants";
import { audio } from "../audio/AudioManager";
import { FONT } from "../ui/pixelText";

export interface FxContext {
  user: Phaser.GameObjects.Sprite;
  /** Cibles distinctes, dans l'ordre. */
  targets: Phaser.GameObjects.Sprite[];
  /** Nombre de coups à résoudre (un « impact » par coup). */
  steps: number;
  impact: (i: number) => void;
  lines: Array<{ who: "user" | "target"; text: string }>;
  shout?: string;
  userIsParty: boolean;
}

type Point = { x: number; y: number };

/** Animations de combat : toutes dessinées en code (formes, particules, bulles de texte). */
export class BattleFx {
  constructor(private readonly scene: Phaser.Scene) {}

  wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(ms, resolve));
  }

  tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => this.scene.tweens.add({ ...config, onComplete: () => resolve() }));
  }

  mid(s: Phaser.GameObjects.Sprite): Point {
    return { x: s.x, y: s.y - s.displayHeight / 2 };
  }

  flash(color: number, alpha: number, ms: number): void {
    const r = this.scene.add.rectangle(0, 0, W, H, color, alpha).setOrigin(0).setDepth(200);
    this.scene.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
  }

  shake(ms: number, intensity: number): void {
    this.scene.cameras.main.shake(ms, intensity);
  }

  float(x: number, y: number, text: string, color: string, size = 8): void {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: "#0f0a26", strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(150);
    this.scene.tweens.add({ targets: t, y: y - 26, duration: 700, ease: "Cubic.easeOut" });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 500, duration: 300, onComplete: () => t.destroy() });
  }

  burst(p: Point, colors: number[], count = 10, spread = 26): void {
    for (let i = 0; i < count; i++) {
      const r = this.scene.add.rectangle(p.x, p.y, 3, 3, colors[i % colors.length]).setDepth(140);
      const a = Math.random() * Math.PI * 2;
      const d = spread * (0.5 + Math.random() * 0.7);
      this.scene.tweens.add({ targets: r, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, alpha: 0, duration: 380, onComplete: () => r.destroy() });
    }
  }

  /** Lance un projectile de `from` vers `to`. */
  async fly(key: string, from: Point, to: Point, ms: number, scale = 1.5): Promise<void> {
    const img = this.scene.add.image(from.x, from.y, key).setScale(scale).setDepth(140);
    img.setAngle(Phaser.Math.RadToDeg(Math.atan2(to.y - from.y, to.x - from.x)));
    await this.tween({ targets: img, x: to.x, y: to.y, duration: ms, ease: "Quad.easeIn" });
    img.destroy();
  }

  /** Bulle de dialogue au-dessus d'un sprite. */
  async bubble(sprite: Phaser.GameObjects.Sprite, text: string, minMs = 450): Promise<void> {
    const t = this.scene.add
      .text(0, 0, text, { fontFamily: FONT, fontSize: "8px", color: "#0f0a26", align: "center", lineSpacing: 4, wordWrap: { width: 150, useAdvancedWrap: true } })
      .setOrigin(0.5);
    const pad = 6;
    const w = t.width + pad * 2;
    const h = t.height + pad * 2;
    const cx = Phaser.Math.Clamp(sprite.x, w / 2 + 4, W - w / 2 - 4);
    const bottom = Math.max(h + 6, sprite.y - sprite.displayHeight - 6);
    const g = this.scene.add.graphics();
    g.fillStyle(0xf4efc8).fillRect(-w / 2, -h, w, h);
    g.lineStyle(2, 0x0f0a26).strokeRect(-w / 2, -h, w, h);
    g.fillStyle(0xf4efc8).fillTriangle(sprite.x - cx - 4, 0, sprite.x - cx + 4, 0, sprite.x - cx, 7);
    t.setPosition(0, -h / 2);
    const box = this.scene.add.container(cx, bottom, [g, t]).setDepth(160).setScale(0.6).setAlpha(0);
    audio.playSfx("blip");
    await this.tween({ targets: box, scale: 1, alpha: 1, duration: 120, ease: "Back.easeOut" });
    await this.wait(minMs + text.length * 26);
    await this.tween({ targets: box, alpha: 0, duration: 100 });
    box.destroy();
  }

  private async speakLines(c: FxContext): Promise<void> {
    for (const line of c.lines) {
      const who = line.who === "user" ? c.user : (c.targets[0] ?? c.user);
      await this.bubble(who, line.text);
    }
  }

  private async dash(c: FxContext, impactAt: () => void, stop = 56): Promise<void> {
    const dir = c.userIsParty ? 1 : -1;
    const t = c.targets[0];
    const x0 = c.user.x;
    await this.tween({ targets: c.user, x: t.x - dir * stop, duration: 170, ease: "Quad.easeIn" });
    impactAt();
    await this.wait(120);
    await this.tween({ targets: c.user, x: x0, duration: 200, ease: "Quad.easeOut" });
  }

  private async impactAll(c: FxContext, delay = 140): Promise<void> {
    for (let i = 0; i < c.steps; i++) {
      c.impact(i);
      await this.wait(delay);
    }
  }

  private shoutText(text: string, size = 16): Promise<void> {
    const t = this.scene.add
      .text(W / 2, 96, text, { fontFamily: FONT, fontSize: `${size}px`, color: "#ffd84a", stroke: "#0f0a26", strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(170)
      .setScale(0.3);
    this.scene.tweens.add({ targets: t, x: { from: W / 2 - 3, to: W / 2 + 3 }, duration: 50, yoyo: true, repeat: 8 });
    return this.tween({ targets: t, scale: 1, duration: 200, ease: "Back.easeOut" })
      .then(() => this.wait(600))
      .then(() => t.destroy());
  }

  async play(anim: string, c: FxContext): Promise<void> {
    const dir = c.userIsParty ? 1 : -1;
    const t0 = c.targets[0];
    const userMid = this.mid(c.user);
    switch (anim) {
      case "shoot":
      case "shoot_power": {
        const power = anim === "shoot_power";
        await this.tween({ targets: c.user, x: c.user.x - dir * 8, duration: 110, yoyo: true });
        audio.playSfx(power ? "special" : "shoot");
        if (power) this.flash(0xffffff, 0.3, 140);
        await this.fly("arrow", { x: userMid.x + dir * 34, y: userMid.y - 6 }, this.mid(t0), power ? 200 : 260, power ? 2.4 : 1.6);
        if (power) this.shake(140, 0.004);
        c.impact(0);
        await this.wait(260);
        return;
      }
      case "kick":
        await this.dash(c, () => {
          audio.playSfx("kick");
          this.burst(this.mid(t0), [0xffffff, 0xf2c14e]);
          c.impact(0);
        });
        return;
      case "kick_special": {
        const x0 = c.user.x;
        await this.tween({ targets: c.user, x: t0.x - dir * 56, y: c.user.y - 24, angle: 360 * dir, duration: 280, ease: "Quad.easeIn" });
        c.user.setAngle(0);
        audio.playSfx("special");
        this.flash(0xffffff, 0.55, 220);
        this.shake(260, 0.008);
        this.burst(this.mid(t0), [0xffffff, 0xf2c14e, 0xc8283a], 18, 40);
        c.impact(0);
        await this.wait(200);
        await this.tween({ targets: c.user, x: x0, y: c.user.y + 24, duration: 220 });
        return;
      }
      case "joke":
        await this.speakLines(c);
        audio.playSfx("joke");
        this.float(t0.x, t0.y - t0.displayHeight - 4, "?!", "#ffd84a", 16);
        await this.wait(300);
        c.impact(0);
        await this.wait(250);
        return;
      case "camion":
        await this.speakLines(c);
        if (c.shout) {
          audio.playSfx("poueet");
          await this.shoutText(c.shout);
        }
        c.impact(0);
        await this.wait(250);
        return;
      case "echo": {
        await this.speakLines(c);
        audio.playSfx("rage");
        for (let i = 0; i < 3; i++) this.float(t0.x - 16 + i * 16, t0.y - t0.displayHeight - 2 - (i % 2) * 6, "#", "#ff4455", 16);
        await this.wait(400);
        c.impact(0);
        await this.wait(250);
        return;
      }
      case "lecture": {
        await this.speakLines(c);
        audio.playSfx("zzz");
        ["z", "Z", "Z"].forEach((z, i) => this.scene.time.delayedCall(i * 180, () => this.float(t0.x + i * 10, t0.y - t0.displayHeight, z, "#9ad0ff", 12 + i * 4)));
        await this.wait(800);
        c.impact(0);
        await this.wait(250);
        return;
      }
      case "keyboard_hit":
        await this.tween({ targets: c.user, x: c.user.x + dir * 16, duration: 90, yoyo: true });
        audio.playSfx("key");
        await this.fly("keycap", this.mid(c.user), this.mid(t0), 200, 2);
        c.impact(0);
        await this.wait(250);
        return;
      case "keyboard": {
        audio.playSfx("key");
        const flights: Promise<void>[] = [];
        for (let i = 0; i < 6; i++) {
          flights.push(
            this.wait(i * 70).then(() => {
              audio.playSfx("key");
              return this.fly("keycap", { x: userMid.x + dir * 20, y: userMid.y - 10 + (i % 3) * 8 }, { x: t0.x, y: this.mid(t0).y + (i % 3) * 6 - 6 }, 220, 2);
            }),
          );
        }
        await Promise.all(flights);
        this.shake(120, 0.004);
        c.impact(0);
        await this.wait(250);
        return;
      }
      case "keyboard_combo": {
        for (let i = 0; i < c.steps; i++) {
          audio.playSfx("key");
          await this.tween({ targets: c.user, x: c.user.x + dir * 10, duration: 60, yoyo: true });
          await this.fly("keycap", this.mid(c.user), this.mid(t0), 150, 2);
          c.impact(i);
          await this.wait(110);
        }
        await this.wait(150);
        return;
      }
      case "tax": {
        if (c.shout) await this.bubble(c.user, c.shout, 250);
        await this.tween({ targets: c.user, y: c.user.y - 12, duration: 120, yoyo: true });
        for (let j = 0; j < 8; j++) {
          const coin = this.scene.add.image(t0.x - 20 + j * 6, -10, "coin").setScale(2).setDepth(140);
          this.scene.tweens.add({ targets: coin, y: this.mid(t0).y + (j % 3) * 6, duration: 320, delay: j * 50, ease: "Quad.easeIn", onStart: () => audio.playSfx("coin"), onComplete: () => coin.destroy() });
        }
        await this.wait(8 * 50 + 330);
        c.impact(0);
        await this.wait(250);
        return;
      }
      case "speech": {
        await this.speakLines(c);
        for (let i = 0; i < 5; i++) {
          this.float(userMid.x - 40 * i - 20, userMid.y - 10 + (i % 2) * 14, "%", "#f2c14e", 16);
          await this.wait(80);
        }
        await this.wait(200);
        await this.impactAll(c, 160);
        await this.wait(200);
        return;
      }
      case "pink": {
        await this.speakLines(c);
        this.flash(0xff7aa8, 0.35, 300);
        const m = this.mid(t0);
        for (let i = 0; i < 6; i++) {
          const h = this.scene.add.image(m.x, m.y, "heart").setScale(2).setDepth(140);
          const a = (i / 6) * Math.PI * 2;
          this.scene.tweens.add({ targets: h, x: m.x + Math.cos(a) * 34, y: m.y + Math.sin(a) * 34, alpha: 0, duration: 500, onComplete: () => h.destroy() });
        }
        t0.setTint(0xffb0c8);
        await this.wait(350);
        t0.clearTint();
        c.impact(0);
        await this.wait(250);
        return;
      }
      case "reform": {
        if (c.shout) await this.bubble(c.user, c.shout, 250);
        audio.playSfx("reform");
        this.flash(0xff3040, 0.4, 400);
        this.shake(420, 0.01);
        const big = this.scene.add
          .text(W / 2, 90, "RÉFORME !", { fontFamily: FONT, fontSize: "24px", color: "#ff4455", stroke: "#0f0a26", strokeThickness: 5 })
          .setOrigin(0.5)
          .setDepth(170)
          .setScale(2.5)
          .setAlpha(0);
        await this.tween({ targets: big, scale: 1, alpha: 1, duration: 260, ease: "Cubic.easeOut" });
        for (let j = 0; j < 8; j++) {
          const p = this.scene.add.image(userMid.x, userMid.y, "paper").setScale(2).setDepth(140);
          this.scene.tweens.add({ targets: p, x: t0.x + Phaser.Math.Between(-20, 20), y: this.mid(t0).y + Phaser.Math.Between(-20, 20), angle: 360, duration: 320, delay: j * 40, onComplete: () => p.destroy() });
        }
        await this.wait(8 * 40 + 330);
        big.destroy();
        c.impact(0);
        await this.wait(300);
        return;
      }
      case "defend": {
        audio.playSfx("defend");
        c.user.setTint(0x88aaff);
        const m = this.mid(c.user);
        const ring = this.scene.add.circle(m.x, m.y, 20).setStrokeStyle(3, 0x88aaff).setDepth(140);
        await this.tween({ targets: ring, scale: 2.6, alpha: 0, duration: 450 });
        ring.destroy();
        c.user.clearTint();
        return;
      }
      case "item": {
        audio.playSfx("heal");
        for (const t of c.targets) {
          const m = this.mid(t);
          for (let i = 0; i < 5; i++) this.scene.time.delayedCall(i * 90, () => this.float(m.x - 16 + i * 8, m.y + 10, "+", "#8fe070", 12));
        }
        await this.wait(500);
        await this.impactAll(c, 100);
        await this.wait(300);
        return;
      }
      default:
        await this.dash(c, () => {
          audio.playSfx("hit");
          c.impact(0);
        });
    }
  }
}
