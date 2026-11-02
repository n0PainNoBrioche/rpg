/**
 * Liste ordonnée des niveaux du jeu (source de vérité partagée).
 * Le serveur s'en sert pour valider la progression, le client pour l'affichage.
 * Pour ajouter un niveau : ajouter une entrée ici, puis son dossier dans src/levels/.
 */
export interface LevelMeta {
  id: string;
  name: string;
  /** Durée minimale (secondes) entre le début et la validation, côté serveur. */
  minDurationSec: number;
}

export const LEVELS: readonly LevelMeta[] = [
  { id: "level01", name: "La taxe du matcha", minDurationSec: 60 },
  { id: "level02", name: "À venir", minDurationSec: 60 },
  { id: "level03", name: "À venir", minDurationSec: 60 },
];

export const FIRST_LEVEL_ID = LEVELS[0].id;

export function getLevelMeta(id: string): LevelMeta | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getNextLevelId(id: string): string | undefined {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? LEVELS[i + 1]?.id : undefined;
}
