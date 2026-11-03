import Phaser from "phaser";

type Draw = (g: Phaser.GameObjects.Graphics) => void;

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function radial(scene: Phaser.Scene, key: string, size: number, stops: Array<[number, string]>): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, c]) => grad.addColorStop(o, c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
}

/** Éléments de décor urbain et textures de lumière, dessinés en code. */
export function bakeProps(scene: Phaser.Scene): void {
  bake(scene, "prop_lamp", 16, 64, (g) => {
    g.fillStyle(0x2a2f45).fillRect(7, 10, 2, 54).fillRect(4, 60, 8, 4).fillRect(7, 8, 7, 2);
    g.fillStyle(0xf2c14e).fillRect(11, 9, 5, 4);
  });
  bake(scene, "prop_bench", 40, 22, (g) => {
    g.fillStyle(0x6b4423).fillRect(0, 10, 40, 4).fillRect(1, 2, 38, 3).fillRect(1, 6, 38, 2);
    g.fillStyle(0x2a2f45).fillRect(4, 14, 3, 8).fillRect(33, 14, 3, 8).fillRect(2, 2, 2, 10).fillRect(36, 2, 2, 10);
  });
  bake(scene, "prop_sign", 32, 52, (g) => {
    g.fillStyle(0x7a7f95).fillRect(15, 18, 2, 34);
    g.fillStyle(0x2a2f45).fillRect(1, 1, 30, 20);
    g.fillStyle(0xf4efc8).fillRect(3, 3, 26, 16);
    g.fillStyle(0x8fbf5a).fillRect(5, 6, 22, 3);
    g.fillStyle(0xc8283a).fillRect(5, 11, 14, 2).fillRect(5, 15, 18, 2);
  });
  bake(scene, "prop_vending", 30, 48, (g) => {
    g.fillStyle(0x2b3a67).fillRect(0, 0, 30, 48);
    g.fillStyle(0x1f2a4d).fillRect(0, 0, 30, 3);
    g.fillStyle(0xf2c14e).fillRect(3, 5, 24, 26);
    g.fillStyle(0xa8d86a).fillRect(5, 8, 5, 8).fillRect(12, 8, 5, 8).fillRect(19, 8, 5, 8);
    g.fillStyle(0xc8283a).fillRect(5, 20, 5, 8).fillRect(12, 20, 5, 8);
    g.fillStyle(0x0f0a26).fillRect(3, 35, 24, 8);
  });
  bake(scene, "prop_bin", 16, 20, (g) => {
    g.fillStyle(0x3a4a5a).fillRect(1, 3, 14, 17).fillStyle(0x2a3644).fillRect(0, 1, 16, 3).fillRect(4, 8, 1, 10).fillRect(8, 8, 1, 10).fillRect(12, 8, 1, 10);
  });
  bake(scene, "prop_stall", 92, 64, (g) => {
    g.fillStyle(0x2a2f45).fillRect(5, 12, 3, 52).fillRect(84, 12, 3, 52);
    g.fillStyle(0x6b4423).fillRect(4, 38, 84, 26).fillStyle(0x4d3019).fillRect(4, 38, 84, 3);
    for (let i = 0; i < 11; i++) g.fillStyle(i % 2 ? 0xf4efc8 : 0xa8d86a).fillRect(2 + i * 8, 10, 8, 16);
    g.fillStyle(0x2a2f45).fillRect(0, 6, 92, 5);
    g.fillStyle(0x8fbf5a).fillRect(14, 32, 6, 6).fillRect(30, 32, 6, 6).fillRect(46, 32, 6, 6);
    g.fillStyle(0xf4efc8).fillRect(16, 30, 2, 2).fillRect(32, 30, 2, 2).fillRect(48, 30, 2, 2);
  });
  bake(scene, "prop_pole", 24, 270, (g) => {
    g.fillStyle(0x0a0719).fillRect(10, 22, 4, 248).fillRect(0, 18, 24, 4).fillRect(0, 22, 4, 6).fillRect(20, 22, 4, 6);
  });
  bake(scene, "shadow", 24, 8, (g) => {
    g.fillStyle(0x000000, 0.45).fillEllipse(12, 4, 24, 8);
  });
  radial(scene, "glow", 64, [
    [0, "rgba(255,225,130,0.85)"],
    [0.4, "rgba(255,200,90,0.3)"],
    [1, "rgba(255,200,90,0)"],
  ]);
  radial(scene, "vignette", 256, [
    [0, "rgba(0,0,0,0)"],
    [0.6, "rgba(0,0,0,0)"],
    [1, "rgba(5,2,20,0.65)"],
  ]);
}
