/** Types du système de combat (aucune dépendance à Phaser : testable en Node). */

export type StatusType = "sleep" | "enrage" | "confuse";
export type SkillKind = "physical" | "mental" | "heal" | "support";
/** Cible relative à l'utilisateur : « enemy » = un adversaire, « ally » = un allié. */
export type TargetType = "enemy" | "allEnemies" | "ally" | "allAllies" | "self";

export interface SkillLine {
  who: "user" | "target";
  /** « {echo} » est remplacé par les dernières paroles de la cible (ragebait). */
  text: string;
}

export interface SkillDef {
  id: string;
  /** Nom court affiché dans les menus (12 caractères max). */
  name: string;
  mpCost: number;
  kind: SkillKind;
  target: TargetType;
  power: number;
  hits?: number;
  status?: { type: StatusType; chance: number; turns: number };
  animation: string;
  /** Message de combat, avec {user} et {target}. */
  message: string;
  lines?: SkillLine[];
  shout?: string;
  echo?: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  target: "ally" | "allAllies";
  hp?: number;
  mp?: number;
}

export interface Stats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  /** Résistance mentale : réduit les dégâts mentaux et les altérations. */
  mres: number;
}

export interface AiRule {
  skill: string;
  weight: number;
  minTurn?: number;
  hpBelow?: number;
}

export interface Combatant {
  id: string;
  name: string;
  side: "party" | "enemy";
  stats: Stats;
  basicSkill: string;
  skills: string[];
  texture: string;
  scale: number;
  statuses: Partial<Record<StatusType, number>>;
  defending: boolean;
  alive: boolean;
  lastQuote?: string;
  ai?: AiRule[];
}

export interface Action {
  actorId: string;
  kind: "attack" | "skill" | "defend" | "item";
  skillId?: string;
  itemId?: string;
  targetIds: string[];
}

export interface StepResult {
  targetId: string;
  damage?: number;
  heal?: number;
  mpRestore?: number;
  crit?: boolean;
  /** Altération infligée par ce coup. */
  status?: StatusType;
  /** Altération tentée mais résistée. */
  resisted?: boolean;
  died?: boolean;
}

export interface ActionOutcome {
  actorId: string;
  kind: Action["kind"];
  animation: string;
  message: string;
  lines: Array<{ who: "user" | "target"; text: string }>;
  shout?: string;
  /** L'acteur n'a pas pu agir : raison affichée. */
  skipped?: string;
  steps: StepResult[];
  /** Message complémentaire (ex. « Maxime se réveille ! »). */
  notes: string[];
}

export interface RoundEvent {
  text: string;
  targetId?: string;
}

export interface EnemyDef {
  name: string;
  texture: string;
  scale?: number;
  stats: Omit<Stats, "hp" | "mp"> & { hp?: number; mp?: number };
  basicSkill: string;
  skills: string[];
  ai: AiRule[];
}

export interface EncounterDef {
  enemies: string[];
  music: string;
  intro: string;
}

export interface EnemyFile {
  encounters: Record<string, EncounterDef>;
  enemies: Record<string, EnemyDef>;
  /** Compétences propres au niveau (par ex. celles du boss). */
  skills: Record<string, Omit<SkillDef, "id">>;
}
