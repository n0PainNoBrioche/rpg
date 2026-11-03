import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/constants";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Décor fixe du combat : ciel de ville, deux rangées d'immeubles, rue éclairée. */
export function createBattleBackdrop(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(0);
  const bands = [0x1a1340, 0x241a52, 0x31236a, 0x4a2c7a, 0x7a3a86, 0xb04a84];
  bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * 22, W, 22));
  const r = rng(9);
  for (let i = 0; i < 40; i++) g.fillStyle(0xf4efc8, 0.4 + r() * 0.5).fillRect(Math.floor(r() * W), Math.floor(r() * 60), 1, 1);

  const skyline = (seed: number, baseY: number, minH: number, maxH: number, color: number, lit: number): void => {
    const q = rng(seed);
    let x = 0;
    while (x < W) {
      const w = Math.min(26 + Math.floor(q() * 34), W - x);
      const h = minH + Math.floor(q() * (maxH - minH));
      g.fillStyle(color).fillRect(x, baseY - h, w, h);
      for (let wy = baseY - h + 6; wy < baseY - 8; wy += 10) {
        for (let wx = x + 5; wx < x + w - 6; wx += 8) if (q() < 0.3) g.fillStyle(0xf2c14e, lit).fillRect(wx, wy, 3, 4);
      }
      x += w;
    }
  };
  skyline(31, 116, 40, 90, 0x2a1f5a, 0.5);
  skyline(47, 132, 40, 100, 0x150f33, 0.85);

  g.fillStyle(0x3a2f6b).fillRect(0, 132, W, 14);
  g.fillStyle(0x2f2558).fillRect(0, 132, W, 2);
  g.fillStyle(0x1f1748).fillRect(0, 146, W, 40);
  g.fillStyle(0xd9c86a, 0.5);
  for (let x = 6; x < W; x += 44) g.fillRect(x, 172, 22, 2);

  for (const lx of [40, 440]) {
    scene.add.image(lx, 92, "glow").setScale(3.2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.4).setDepth(1);
    g.fillStyle(0x2a2f45).fillRect(lx - 1, 96, 2, 44);
  }
}
