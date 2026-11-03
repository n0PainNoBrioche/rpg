import Phaser from "phaser";

type Palette = Record<string, string>;

/** Transforme une grille de caractères en texture (1 caractère = 1 pixel). */
export function bakeRows(scene: Phaser.Scene, key: string, rows: string[], palette: Palette): void {
  if (scene.textures.exists(key)) return;
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`Sprite « ${key} » : la ligne ${i} fait ${r.length} px au lieu de ${w}`);
  });
  const tex = scene.textures.createCanvas(key, w, rows.length);
  if (!tex) return;
  const ctx = tex.getContext();
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const color = palette[c];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }),
  );
  tex.refresh();
}

// ---------------------------------------------------------------- Héroïne
const HERO_PALETTE: Palette = {
  K: "#2a1a26", H: "#b9733f", h: "#d98b4e", S: "#f3d3c0", E: "#3b7be0",
  D: "#c8283a", d: "#8f1b2b", B: "#6b4423",
};
const HERO_BODY = [
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
];
const HERO_LEGS = {
  stand: ["...KSSK..KSSK...", "...KSSK..KSSK...", "..KKBBK..KBBKK.."],
  wide: ["..KSSK....KSSK..", "..KSSK....KSSK..", ".KKBBK....KBBKK."],
  narrow: ["....KSSKKSSK....", "....KSSKKSSK....", "...KKBBKKBBKK..."],
};

// ---------------------------------------------------------------- Clément
const CLEMENT_PALETTE: Palette = {
  K: "#2a1a26", C: "#c9a06a", y: "#e6c88f", S: "#f3d3c0", E: "#3b7be0",
  W: "#f2f2f2", w: "#c9cdd8", J: "#3b5fa8", j: "#2b4682",
};
const CLEMENT_BODY = [
  ".....KKKKKK.....",
  "...KKCCCCCCKK...",
  "..KCCyCCCCyCCK..",
  "..KCCCCCCCCCCK..",
  "..KCCSSSSSSCCK..",
  "..KCSSSSSSSSCK..",
  "..KCSESSSSESCK..",
  "..KCSSSSSSSSCK..",
  "..KCCSSSSSSCCK..",
  "..KCCCSSSSCCCK..",
  "..KCCWWWWWWCCK..",
  "..KWWWWWWWWWWK..",
  ".KSWWWWWWWWWWSK.",
  ".KSWWWWwwWWWWSK.",
  ".KSKWWWWWWWWKSK.",
  "..KKWWWWWWWWKK..",
  "...KWWWWWWWWK...",
  "...KJJJJJJJJK...",
  "...KJJJJJJJJK...",
  "...KJJJKKJJJK...",
];
const CLEMENT_LEGS = {
  stand: ["...KJJJK.KJJJK..", "...KJJJK.KJJJK..", "...KjjjK.KjjjK..", "..KKWWKK.KWWKK.."],
  wide: ["..KJJJK..KJJJK..", "..KJJJK..KJJJK..", "..KjjjK..KjjjK..", ".KKWWKK..KKWWKK."],
  narrow: ["....KJJKKJJK....", "....KJJKKJJK....", "....KjjKKjjK....", "...KKWWKKWWKK..."],
};

// ---------------------------------------------------------------- Macron (boss)
const MAXIME_PALETTE: Palette = {
  K: "#2a1a26", G: "#4a4a58", S: "#f0cdb8", E: "#2a3a8a", k: "#a0504a",
  N: "#2b3a67", n: "#1f2a4d", W: "#f4f4f4", T: "#7a3a86",
};
const MAXIME = [
  ".....KKKKKK.....",
  "...KKGGGGGGKK...",
  "..KGGGGGGGGGGK..",
  "..KGGGGGGGGGGK..",
  "..KGSSSSSSSSGK..",
  "..KSSSSSSSSSSK..",
  "..KSKKSSSSKKSK..",
  "..KSSESSSSESSK..",
  "..KSSSSSSSSSSK..",
  "..KSSSSkkSSSSK..",
  "...KSSSSSSSSK...",
  "....KKSSSSKK....",
  "..KNNWWWWWWNNK..",
  ".KNNNWWTTWWNNNK.",
  ".KNNNNWTTWNNNNK.",
  ".KSNNNNTTNNNNSK.",
  ".KSNNNNTTNNNNSK.",
  ".KNNNNNTTNNNNNK.",
  "..KNNNNNNNNNNK..",
  "..KNNNNKKNNNNK..",
  "..KnnnnK.KnnnnK.",
  "..KnnnnK.KnnnnK.",
  "..KnnnnK.KnnnnK.",
  "..KKKKKK.KKKKKK.",
];

const SMALL: Record<string, { rows: string[]; palette: Palette }> = {
  arrow: {
    rows: ["RR.........G..", "RBBBBBBBBBGGG.", "RR.........G.."],
    palette: { R: "#c8283a", B: "#6b4423", G: "#cfd3dc" },
  },
  heart: {
    rows: [".PP.PP.", "PPPPPPP", "PPPPPPP", ".PPPPP.", "..PPP..", "...P..."],
    palette: { P: "#ff7aa8" },
  },
  coin: {
    rows: [".YYYY.", "YyYYyY", "YyYYyY", "YyYYyY", "YyyyyY", ".YYYY."],
    palette: { Y: "#f2c14e", y: "#c99a2e" },
  },
  keycap: {
    rows: ["KKKKKKK", "KLLLLLK", "KLDDDLK", "KLDDDLK", "KLLLLLK", "KKKKKKK"],
    palette: { K: "#2a1a26", L: "#e8e8f0", D: "#9aa0b4" },
  },
  spark: {
    rows: [".Y.", "YYY", ".Y."],
    palette: { Y: "#fff3a0" },
  },
  paper: {
    rows: ["KKKKKKK", "KWWWWWK", "KWKKKWK", "KWWWWWK", "KWKKKWK", "KWWWWWK", "KKKKKKK"],
    palette: { K: "#8a8fa8", W: "#f4f4f4" },
  },
};

function bakeWalkSet(
  scene: Phaser.Scene,
  key: string,
  body: string[],
  legs: Record<"stand" | "wide" | "narrow", string[]>,
  palette: Palette,
): void {
  bakeRows(scene, key, [...body, ...legs.stand], palette);
  bakeRows(scene, `${key}_w1`, [...body, ...legs.wide], palette);
  bakeRows(scene, `${key}_w2`, [...body, ...legs.narrow], palette);
  scene.anims.create({
    key: `${key}-walk`,
    frames: [{ key: `${key}_w1` }, { key }, { key: `${key}_w2` }, { key }],
    frameRate: 8,
    repeat: -1,
  });
}

/** Génère toutes les textures de personnages et leurs animations (sprites temporaires remplaçables). */
export function bakeAllSprites(scene: Phaser.Scene): void {
  bakeWalkSet(scene, "hero", HERO_BODY, HERO_LEGS, HERO_PALETTE);
  bakeWalkSet(scene, "clement", CLEMENT_BODY, CLEMENT_LEGS, CLEMENT_PALETTE);
  bakeRows(scene, "macron", MAXIME, MAXIME_PALETTE);
  bakeRows(scene, "portrait_hero", HERO_BODY.slice(0, 13), HERO_PALETTE);
  bakeRows(scene, "portrait_clement", CLEMENT_BODY.slice(0, 13), CLEMENT_PALETTE);
  bakeRows(scene, "portrait_macron", MAXIME.slice(0, 13), MAXIME_PALETTE);
  for (const [key, { rows, palette }] of Object.entries(SMALL)) bakeRows(scene, key, rows, palette);
}
