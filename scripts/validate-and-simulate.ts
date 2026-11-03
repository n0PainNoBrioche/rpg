// Vérifie les données du niveau 1 et simule des combats pour contrôler l'équilibrage.
// Usage : npx tsx scripts/validate-and-simulate.ts
import { CombatManager } from "../src/combat/CombatManager";
import type { Action, Combatant, ItemDef, SkillDef } from "../src/combat/CombatAction";
import { createEnemy, createPartyMember } from "../src/characters/Character";
import skillData from "../src/combat/data/skills.json";
import itemData from "../src/combat/data/items.json";
import dialogues from "../src/levels/Level01/dialogues.json";
import events from "../src/levels/Level01/events.json";
import enemies from "../src/levels/Level01/enemies.json";
import { LEVELS } from "../shared/levels";

let errors = 0;
const fail = (m: string) => {
  console.error("ERREUR", m);
  errors++;
};
const ids = <T extends object>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).map(([id, v]) => [id, { ...v, id }]));
const skills = { ...ids(skillData as any), ...ids(enemies.skills as any) } as Record<string, SkillDef>;
const items = ids(itemData as any) as Record<string, ItemDef>;

// ---- 1. cohérence des données
const scenes = dialogues.scenes as Record<string, Array<{ speaker?: string; text: string }>>;
const speakers = dialogues.speakers as Record<string, unknown>;
for (const [id, lines] of Object.entries(scenes)) for (const l of lines) if (l.speaker && !speakers[l.speaker]) fail(`dialogue ${id}: locuteur inconnu ${l.speaker}`);
const refs: string[] = [];
const walk = (acts: any[]) => {
  for (const a of acts) {
    if (a.type === "dialogue") refs.push(a.id);
    if (a.type === "battle" && !(enemies.encounters as any)[a.encounter]) fail(`rencontre inconnue ${a.encounter}`);
    if (a.type === "choice") a.options.forEach((o: any) => walk(o.then));
    if (a.type === "branch") walk([...a.then, ...(a.else ?? [])]);
  }
};
for (const ev of events as any[]) walk(ev.actions);
for (const r of refs) if (!scenes[r]) fail(`dialogue référencé mais absent : ${r}`);
for (const [id, s] of Object.entries(skills)) {
  if (s.name.length > 12 && !(id in (enemies.skills as object))) fail(`nom de compétence trop long (>12) : ${s.name}`);
}
for (const [id, e] of Object.entries(enemies.enemies as Record<string, any>)) {
  for (const sid of e.skills) if (!skills[sid]) fail(`ennemi ${id}: compétence inconnue ${sid}`);
}
if (!LEVELS.some((l) => l.id === "level01")) fail("level01 absent de shared/levels");
console.log(`Données : ${Object.keys(scenes).length} dialogues, ${(events as any[]).length} événements, ${Object.keys(skills).length} compétences`);

// ---- 2. simulation : une « IA joueur » correcte mais pas optimale
function newBattle(seed: number): CombatManager {
  let s = seed;
  const rng = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const party = [createPartyMember("heroine", "Sacha"), createPartyMember("clement", "Clément")];
  const boss = createEnemy("maxime", (enemies.enemies as any).maxime);
  return new CombatManager([...party, boss], skills, items, { chocolat_chaud: 2, the_glace: 1 }, rng);
}

function playerActions(cm: CombatManager, rng: () => number): Action[] {
  const boss = cm.side("enemy")[0];
  const acts: Action[] = [];
  for (const m of cm.side("party")) {
    if (m.statuses.sleep) {
      acts.push({ actorId: m.id, kind: "defend", targetIds: [] });
      continue;
    }
    const lowHp = m.stats.hp < m.stats.maxHp * 0.35;
    if (lowHp && (cm.inventory.chocolat_chaud ?? 0) > 0) {
      acts.push({ actorId: m.id, kind: "item", itemId: "chocolat_chaud", targetIds: [m.id] });
      continue;
    }
    const usable = m.skills.filter((id) => cm.skill(id).mpCost <= m.stats.mp);
    const useSkill = usable.length > 0 && rng() < 0.6;
    if (useSkill) {
      const sid = usable[Math.floor(rng() * usable.length)];
      acts.push({ actorId: m.id, kind: "skill", skillId: sid, targetIds: [boss.id] });
    } else {
      acts.push({ actorId: m.id, kind: "attack", skillId: m.basicSkill, targetIds: [boss.id] });
    }
  }
  return acts;
}

let wins = 0;
const N = 400;
const rounds: number[] = [];
const hpLeft: number[] = [];
for (let seed = 1; seed <= N; seed++) {
  const cm = newBattle(seed * 7919);
  let r = Math.sin(seed) * 0.5 + 0.5;
  const prng = () => (r = (r * 9301 + 49297) % 233280 / 233280);
  let guard = 0;
  while (!cm.result() && guard++ < 60) {
    const all = cm.sortActions([...playerActions(cm, prng), ...cm.planEnemyActions()]);
    for (const a of all) {
      if (!cm.get(a.actorId).alive) continue;
      cm.resolve(a);
      if (cm.result()) break;
    }
    if (!cm.result()) cm.endRound();
  }
  if (cm.result() === "victory") {
    wins++;
    rounds.push(cm.turn);
    hpLeft.push(cm.side("party").reduce((n, c) => n + c.stats.hp, 0));
  }
}
const avg = (a: number[]) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : "n/a");
console.log(`Simulation (${N} combats, joueur moyen) : ${((wins / N) * 100).toFixed(0)} % de victoires, ${avg(rounds)} manches, ${avg(hpLeft)} PV restants (équipe)`);
if (wins / N < 0.7) fail("combat trop difficile (<70 % de victoires pour un joueur moyen)");
if (wins / N > 0.995) console.warn("Avertissement : le combat est peut-être trop facile");
process.exit(errors ? 1 : 0);
