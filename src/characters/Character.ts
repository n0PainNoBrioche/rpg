import type { Combatant, EnemyDef } from "../combat/CombatAction";
import data from "./characters.json";

export interface CharacterDef {
  name: string;
  texture: string;
  scale: number;
  stats: { maxHp: number; maxMp: number; atk: number; def: number; spd: number; mres: number };
  basicSkill: string;
  skills: string[];
}

export const characterDefs = data as Record<string, CharacterDef>;

/** Construit un combattant du camp du joueur. « @hero » devient le prénom choisi. */
export function createPartyMember(id: string, heroName: string): Combatant {
  const def = characterDefs[id];
  if (!def) throw new Error(`Personnage inconnu : ${id}`);
  return {
    id,
    name: def.name === "@hero" ? heroName : def.name,
    side: "party",
    stats: { ...def.stats, hp: def.stats.maxHp, mp: def.stats.maxMp },
    basicSkill: def.basicSkill,
    skills: [...def.skills],
    texture: def.texture,
    scale: def.scale,
    statuses: {},
    defending: false,
    alive: true,
  };
}

export function createEnemy(id: string, def: EnemyDef): Combatant {
  return {
    id,
    name: def.name,
    side: "enemy",
    stats: { ...def.stats, hp: def.stats.hp ?? def.stats.maxHp, mp: def.stats.mp ?? def.stats.maxMp },
    basicSkill: def.basicSkill,
    skills: [...def.skills],
    texture: def.texture,
    scale: def.scale ?? 4,
    statuses: {},
    defending: false,
    alive: true,
    ai: def.ai,
  };
}
