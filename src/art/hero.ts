import Phaser from "phaser";

/** Sprite temporaire de l'héroïne (16x24), remplaçable par une vraie feuille de sprites. */
const PALETTE: Record<string, string> = {
  K: "#2a1a26", // contour
  H: "#b9733f", // cheveux châtain
  h: "#d98b4e", // reflets roux
  S: "#f3d3c0", // peau
  E: "#3b7be0", // yeux bleus
  D: "#c8283a", // robe rouge
  d: "#8f1b2b", // robe ombrée
  B: "#6b4423", // bottes
};

const HERO_ROWS = [
  ".....KKKKKK.....",
  "...KKHHHHHHKK...",
  "..KHHhHHHHhHHK..",
  "..KHHHHHHHHHHK..",
  "..KHHSSSSSSHHK..",
  "..KHSSSSSSSSHK..",
  "..KHSESSSSESHK..",
  "..KHSSSSSSSSHK..",
  "..KHHSSSSSSHHK..",
  "..KHHHSSSSHHHK..",
  ".KHHHDDDDDDHHHK.",
  ".KHHDDDDDDDDHHK.",
  ".KSHDDDDDDDDHSK.",
  ".KSHDDddDDDDHSK.",
  "..KHDDDDDDDDHK..",
  "..KDDDDDDDDDDK..",
  ".KDDDDDddDDDDDK.",
  ".KDDDDDddDDDDDK.",
  "KDDDDDDddDDDDDDK",
  "KddddddddddddddK",
  ".KKKKKKKKKKKKKK.",
  "...KSSK..KSSK...",
  "...KSSK..KSSK...",
  "..KKBBK..KBBKK..",
];

export const HERO_TEXTURE = "hero";

export function bakeHero(scene: Phaser.Scene): void {
  if (scene.textures.exists(HERO_TEXTURE)) return;
  const tex = scene.textures.createCanvas(HERO_TEXTURE, HERO_ROWS[0].length, HERO_ROWS.length);
  if (!tex) return;
  const ctx = tex.getContext();
  HERO_ROWS.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const color = PALETTE[c];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }),
  );
  tex.refresh();
}
