import Phaser from "phaser";

export const FONT = '"Press Start 2P", monospace';
export const COLORS = {
  cream: "#f4efc8",
  matcha: "#a8d86a",
  red: "#e8475a",
  grey: "#7a7399",
  night: "#0f0a26",
};

export function pixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 8,
  color = COLORS.cream,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, align: "center" })
    .setOrigin(0.5)
    .setShadow(1, 1, "#000000", 0, false, true);
}

/** Fenêtre de style JRPG : fond sombre et bordure claire. */
export function drawPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x0f0a26, 0.88).fillRect(x, y, w, h);
  g.lineStyle(2, 0xf4efc8, 1).strokeRect(x + 1, y + 1, w - 2, h - 2);
  return g;
}
