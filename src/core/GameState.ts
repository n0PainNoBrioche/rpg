import type { SaveData } from "../../shared/types";

/** État de session partagé entre les scènes (la vérité reste sur le serveur). */
export const gameState: {
  save: SaveData | null;
  levelSession: { levelId: string; token: string } | null;
} = { save: null, levelSession: null };
