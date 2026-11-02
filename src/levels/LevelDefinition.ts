/**
 * Contrat d'un niveau : le moteur ne connaît que cette interface.
 * Chaque dossier LevelXX/ exporte une définition enregistrée dans levelRegistry.ts.
 */
export interface LevelDefinition {
  id: string;
  /** Clé de la scène Phaser qui joue ce niveau. */
  sceneKey: string;
}
