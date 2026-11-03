import type { EventDef } from "../../core/EventRunner";
import type { EnemyFile } from "../../combat/CombatAction";
import type { DialogueFile } from "../../ui/DialogueBox";
import type { LevelDefinition } from "../LevelDefinition";
import dialogues from "./dialogues.json";
import events from "./events.json";
import enemies from "./enemies.json";

/** Niveau 1 : La taxe tampon. Décor, personnages et contenu (dialogues, événements, ennemis en JSON). */
export const level01: LevelDefinition = {
  id: "level01",
  sceneKey: "ExplorationScene",
  worldWidth: 1700,
  playerStart: 80,
  music: "exploration",
  party: ["heroine", "clement"],
  startingItems: { chocolat_chaud: 2, the_glace: 1 },
  props: [
    { id: "lamp1", type: "lamp", x: 130, glow: true },
    { id: "bench1", type: "bench", x: 230 },
    { id: "lamp2", type: "lamp", x: 430, glow: true },
    { id: "sign1", type: "sign", x: 560 },
    { id: "vending1", type: "vending", x: 650 },
    { id: "lamp3", type: "lamp", x: 760, glow: true },
    { id: "bin1", type: "bin", x: 830 },
    { id: "bench2", type: "bench", x: 900 },
    { id: "stall1", type: "stall", x: 1010 },
    { id: "lamp4", type: "lamp", x: 1130, glow: true },
    { id: "lamp5", type: "lamp", x: 1560, glow: true },
  ],
  actors: [
    { id: "clement", texture: "clement", x: 1390, scale: 2, pose: "down" },
    { id: "maxime", texture: "maxime", x: 1475, scale: 2.1, facing: -1 },
  ],
  dialogues: dialogues as unknown as DialogueFile,
  events: events as unknown as EventDef[],
  enemies: enemies as unknown as EnemyFile,
};
