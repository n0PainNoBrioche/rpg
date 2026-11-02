/** Types partagés entre le frontend et le backend. */

export type CharacterName = "Sacha" | "Léa";
export const CHARACTER_NAMES: readonly CharacterName[] = ["Sacha", "Léa"];

/** Nombre maximum d'emplacements de sauvegarde. */
export const MAX_SAVES = 6;

export interface SaveData {
  id: string;
  /** Pseudo affiché dans la liste : le prénom choisi. */
  pseudo: string;
  character: CharacterName;
  createdAt: string;
  updatedAt: string;
  completedLevels: string[];
  unlockedLevels: string[];
  lastCompletedLevel: string | null;
}

export interface SaveSummary {
  id: string;
  pseudo: string;
  character: CharacterName;
  lastCompletedLevel: string | null;
  completedCount: number;
  updatedAt: string;
}

export interface LevelStartResponse {
  token: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}
