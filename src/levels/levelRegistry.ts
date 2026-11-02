import type { LevelDefinition } from "./LevelDefinition";
import { level01 } from "./Level01/Level01";

/** Registre des niveaux implémentés. Les niveaux absents s'affichent « À venir ». */
export const levelRegistry: Record<string, LevelDefinition> = {
  [level01.id]: level01,
};
