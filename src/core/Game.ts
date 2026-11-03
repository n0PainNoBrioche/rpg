import Phaser from "phaser";
import { BootScene } from "../scenes/BootScene";
import { MenuScene } from "../scenes/MenuScene";
import { SaveSlotsScene } from "../scenes/SaveSlotsScene";
import { CharacterSelectionScene } from "../scenes/CharacterSelectionScene";
import { LevelSelectScene } from "../scenes/LevelSelectScene";
import { ExplorationScene } from "../scenes/ExplorationScene";
import { BattleScene } from "../scenes/BattleScene";
import { GameOverScene } from "../scenes/GameOverScene";
import { LevelCompleteScene } from "../scenes/LevelCompleteScene";
import { AudioOverlayScene } from "../scenes/AudioOverlayScene";

import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

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
    scene: [BootScene, MenuScene, SaveSlotsScene, CharacterSelectionScene, LevelSelectScene,
      ExplorationScene,
      BattleScene,
      GameOverScene,
      LevelCompleteScene,
      AudioOverlayScene,
    ],
  });
}
