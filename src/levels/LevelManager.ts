import { LEVELS, type LevelMeta } from "../../shared/levels";
import type { SaveData } from "../../shared/types";
import { levelRegistry } from "./levelRegistry";
import type { LevelDefinition } from "./LevelDefinition";

export type LevelStatus = "completed" | "available" | "soon" | "locked";

export interface LevelEntry {
  meta: LevelMeta;
  definition?: LevelDefinition;
  status: LevelStatus;
}

export const LevelManager = {
  /** Vue des niveaux pour une sauvegarde donnée. */
  entriesFor(save: SaveData): LevelEntry[] {
    return LEVELS.map((meta) => {
      const definition = levelRegistry[meta.id];
      let status: LevelStatus;
      if (save.completedLevels.includes(meta.id)) status = "completed";
      else if (!save.unlockedLevels.includes(meta.id)) status = "locked";
      else status = definition ? "available" : "soon";
      return { meta, definition, status };
    });
  },
};
