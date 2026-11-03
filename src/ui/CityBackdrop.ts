import Phaser from "phaser";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../core/constants";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Dessine une rangée d'immeubles qui boucle sur la largeur de l'écran (motif répété deux fois). */
function buildingLayer(scene: Phaser.Scene, seed: number, baseY: number, minH: number, maxH: number, color: number, lit: number) {
  const g = scene.add.graphics();
  const draw = (offset: number) => {
    const r = rng(seed);
    let x = 0;
    while (x < W) {
      const w = Math.min(24 + Math.floor(r() * 30), W - x);
      const h = minH + Math.floor(r() * (maxH - minH));
      g.fillStyle(color).fillRect(offset + x, baseY - h, w, h + 40);
      for (let wy = baseY - h + 6; wy < baseY - 6; wy += 10) {
        for (let wx = x + 5; wx < x + w - 6; wx += 8) {
          if (r() < 0.3) g.fillStyle(0xf2c14e, lit).fillRect(offset + wx, wy, 3, 4);
        }
      }
      x += w;
    }
  };
  draw(0);
  draw(W);
  return g;
}

/** Décor de ville nocturne en plusieurs plans, avec défilement lent et enseigne néon. */
export function createCityBackdrop(scene: Phaser.Scene): void {
  const sky = scene.add.graphics();
  const bands = [0x1a1340, 0x241a52, 0x31236a, 0x4a2c7a, 0x7a3a86, 0xb04a84, 0xd9627f];
  const bandH = Math.ceil((H * 0.72) / bands.length);
  bands.forEach((c, i) => sky.fillStyle(c).fillRect(0, i * bandH, W, bandH));
  sky.fillStyle(bands[bands.length - 1]).fillRect(0, bands.length * bandH, W, H);

  const r = rng(7);
  const stars = scene.add.graphics();
  for (let i = 0; i < 45; i++) {
    stars.fillStyle(0xf4efc8, 0.4 + r() * 0.6).fillRect(Math.floor(r() * W), Math.floor(r() * 110), 1, 1);
  }
  const moon = scene.add.graphics();
  moon.fillStyle(0xf4efc8).fillCircle(400, 46, 15);
  moon.fillStyle(0x241a52).fillCircle(407, 41, 13);

  const far = buildingLayer(scene, 11, 190, 40, 90, 0x2a1f5a, 0.55);
  const near = buildingLayer(scene, 23, 232, 50, 110, 0x150f33, 0.9);
  scene.tweens.add({ targets: far, x: -W, duration: 90000, repeat: -1 });
  scene.tweens.add({ targets: near, x: -W, duration: 45000, repeat: -1 });

  const street = scene.add.graphics();
  street.fillStyle(0x0d0922).fillRect(0, 232, W, H - 232);
  street.fillStyle(0x2a1f5a).fillRect(0, 232, W, 2);

  // Enseigne néon verte, fixe au premier plan, qui grésille.
  const sign = scene.add.graphics();
  sign.fillStyle(0x8fbf5a, 0.25).fillRect(40, 196, 70, 22);
  sign.lineStyle(2, 0xa8d86a).strokeRect(44, 200, 62, 14);
  sign.fillStyle(0xa8d86a).fillRect(52, 205, 46, 3);
  scene.tweens.add({ targets: sign, alpha: 0.55, duration: 140, yoyo: true, repeat: -1, repeatDelay: 1800 });
}
