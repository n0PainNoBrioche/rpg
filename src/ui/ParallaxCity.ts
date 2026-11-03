import Phaser from "phaser";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../core/constants";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Skyline qui boucle exactement sur la largeur de l'écran. */
function bakeSkyline(scene: Phaser.Scene, key: string, seed: number, baseY: number, minH: number, maxH: number, color: number, lit: number, neon: boolean): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const r = rng(seed);
  let x = 0;
  while (x < W) {
    const w = Math.min(26 + Math.floor(r() * 34), W - x);
    const h = minH + Math.floor(r() * (maxH - minH));
    g.fillStyle(color).fillRect(x, baseY - h, w, h);
    g.fillStyle(0xffffff, 0.05).fillRect(x, baseY - h, 2, h);
    for (let wy = baseY - h + 6; wy < baseY - 8; wy += 10) {
      for (let wx = x + 5; wx < x + w - 6; wx += 8) {
        if (r() < 0.32) g.fillStyle(0xf2c14e, lit).fillRect(wx, wy, 3, 4);
      }
    }
    if (neon && r() < 0.35 && w > 30) {
      g.fillStyle(0xa8d86a, 0.9).fillRect(x + 4, baseY - h + 14, w - 8, 3);
    }
    x += w;
  }
  g.generateTexture(key, W, H);
  g.destroy();
}

function bakeBackdropTextures(scene: Phaser.Scene, groundY: number): void {
  if (!scene.textures.exists("city_sky")) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    const bands = [0x1a1340, 0x241a52, 0x31236a, 0x4a2c7a, 0x7a3a86, 0xb04a84, 0xd9627f];
    const bandH = Math.ceil((H * 0.78) / bands.length);
    bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * bandH, W, bandH));
    g.fillStyle(bands[bands.length - 1]).fillRect(0, bands.length * bandH, W, H);
    const r = rng(5);
    for (let i = 0; i < 50; i++) g.fillStyle(0xf4efc8, 0.35 + r() * 0.6).fillRect(Math.floor(r() * W), Math.floor(r() * 120), 1, 1);
    g.fillStyle(0xf4efc8).fillCircle(390, 44, 15).fillStyle(0x241a52).fillCircle(397, 39, 13);
    g.generateTexture("city_sky", W, H);
    g.destroy();
  }
  bakeSkyline(scene, "city_far", 11, groundY - 14, 50, 110, 0x2a1f5a, 0.5, false);
  bakeSkyline(scene, "city_near", 23, groundY - 2, 70, 130, 0x150f33, 0.85, true);
  if (!scene.textures.exists("city_ground")) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x3a2f6b).fillRect(0, 0, 32, 28);
    g.fillStyle(0x2f2558).fillRect(0, 0, 32, 2).fillRect(0, 14, 32, 1).fillRect(15, 0, 1, 14).fillRect(0, 14, 1, 14).fillRect(31, 14, 1, 14);
    g.fillStyle(0x1a1340).fillRect(0, 28, 32, 26);
    g.fillStyle(0x0d0922).fillRect(0, 28, 32, 3);
    g.fillStyle(0xd9c86a, 0.7).fillRect(4, 41, 12, 2);
    g.generateTexture("city_ground", 32, 54);
    g.destroy();
  }
}

/** Décor urbain nocturne en plusieurs plans (ciel fixe, deux skylines en parallaxe, trottoir). */
export class ParallaxCity {
  private far: Phaser.GameObjects.TileSprite;
  private near: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene, worldWidth: number, readonly groundTop: number) {
    bakeBackdropTextures(scene, groundTop);
    scene.add.image(0, 0, "city_sky").setOrigin(0).setScrollFactor(0).setDepth(0);
    this.far = scene.add.tileSprite(0, 0, W, H, "city_far").setOrigin(0).setScrollFactor(0).setDepth(1);
    this.near = scene.add.tileSprite(0, 0, W, H, "city_near").setOrigin(0).setScrollFactor(0).setDepth(2);
    scene.add.tileSprite(0, groundTop, worldWidth, 54, "city_ground").setOrigin(0).setDepth(3);
  }

  update(scrollX: number): void {
    this.far.tilePositionX = scrollX * 0.2;
    this.near.tilePositionX = scrollX * 0.55;
  }
}
