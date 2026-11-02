import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { MenuScene } from "../scenes/MenuScene";
import { SaveSlotsScene } from "../scenes/SaveSlotsScene";
import { CharacterSelectionScene } from "../scenes/CharacterSelectionScene";
import { LevelSelectScene } from "../scenes/LevelSelectScene";
import { ExplorationScene } from "../scenes/ExplorationScene";

/** Résolution logique 16:9, mise à l'échelle par Phaser (pixels nets). */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export function createGame(parent: string): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#0d0922",
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, MenuScene, SaveSlotsScene, CharacterSelectionScene, LevelSelectScene, ExplorationScene],
  });
}
