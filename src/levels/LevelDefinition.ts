import type { EventDef } from "../core/EventRunner";
import type { DialogueFile } from "../ui/DialogueBox";
import type { EnemyFile } from "../combat/CombatAction";

export type PropType = "lamp" | "bench" | "sign" | "vending" | "bin" | "stall";

export interface PropDef {
  /** Identifiant utilisable comme cible d'un événement « interact ». */
  id: string;
  type: PropType;
  x: number;
  /** Halo lumineux (lampadaires). */
  glow?: boolean;
}

export interface ActorDef {
  id: string;
  texture: string;
  x: number;
  scale?: number;
  facing?: 1 | -1;
  /** « down » : allongé au sol. */
  pose?: "idle" | "down";
}

/**
 * Contrat d'un niveau : le moteur ne connaît que cette interface.
 * Chaque dossier LevelXX/ exporte une définition enregistrée dans levelRegistry.ts.
 */
export interface LevelDefinition {
  id: string;
  /** Clé de la scène Phaser qui joue ce niveau. */
  sceneKey: string;
  worldWidth: number;
  playerStart: number;
  music: string;
  party: string[];
  startingItems: Record<string, number>;
  props: PropDef[];
  actors: ActorDef[];
  dialogues: DialogueFile;
  events: EventDef[];
  enemies: EnemyFile;
}
