import type {
  Action,
  ActionOutcome,
  Combatant,
  ItemDef,
  RoundEvent,
  SkillDef,
  StatusType,
  StepResult,
} from "./CombatAction";

export type Rng = () => number;
export type BattleResult = "victory" | "defeat";

const STATUS_NAMES: Record<StatusType, string> = {
  sleep: "s'endort",
  enrage: "s'énerve",
  confuse: "est confus",
};

/** Règles du combat au tour par tour : pures, sans Phaser, testables en Node. */
export class CombatManager {
  turn = 1;

  constructor(
    readonly combatants: Combatant[],
    private readonly skills: Record<string, SkillDef>,
    private readonly items: Record<string, ItemDef>,
    readonly inventory: Record<string, number>,
    private readonly rng: Rng = Math.random,
  ) {}

  get(id: string): Combatant {
    const c = this.combatants.find((x) => x.id === id);
    if (!c) throw new Error(`Combattant inconnu : ${id}`);
    return c;
  }

  skill(id: string): SkillDef {
    const s = this.skills[id];
    if (!s) throw new Error(`Compétence inconnue : ${id}`);
    return s;
  }

  item(id: string): ItemDef {
    const i = this.items[id];
    if (!i) throw new Error(`Objet inconnu : ${id}`);
    return i;
  }

  side(side: Combatant["side"], aliveOnly = true): Combatant[] {
    return this.combatants.filter((c) => c.side === side && (!aliveOnly || c.alive));
  }

  /** Cibles possibles d'une compétence pour un acteur. */
  validTargets(actor: Combatant, target: SkillDef["target"] | "ally" | "allAllies"): Combatant[] {
    const foes = this.side(actor.side === "party" ? "enemy" : "party");
    const friends = this.side(actor.side);
    switch (target) {
      case "enemy":
      case "allEnemies":
        return foes;
      case "ally":
      case "allAllies":
        return friends;
      case "self":
        return [actor];
    }
  }

  result(): BattleResult | null {
    if (this.side("enemy").length === 0) return "victory";
    if (this.side("party").length === 0) return "defeat";
    return null;
  }

  // ------------------------------------------------------------------ planification

  planEnemyActions(): Action[] {
    return this.side("enemy").map((enemy) => {
      const rules = (enemy.ai ?? []).filter((r) => {
        const s = this.skill(r.skill);
        return (
          s.mpCost <= enemy.stats.mp &&
          (r.minTurn === undefined || this.turn >= r.minTurn) &&
          (r.hpBelow === undefined || enemy.stats.hp / enemy.stats.maxHp <= r.hpBelow)
        );
      });
      const pool = rules.length > 0 ? rules : [{ skill: enemy.basicSkill, weight: 1 }];
      const total = pool.reduce((n, r) => n + r.weight, 0);
      let roll = this.rng() * total;
      let chosen = pool[0];
      for (const r of pool) {
        roll -= r.weight;
        if (roll <= 0) {
          chosen = r;
          break;
        }
      }
      const skill = this.skill(chosen.skill);
      return { actorId: enemy.id, kind: "skill", skillId: skill.id, targetIds: this.pickTargets(enemy, skill) };
    });
  }

  private pickTargets(actor: Combatant, skill: SkillDef): string[] {
    const pool = this.validTargets(actor, skill.target);
    if (pool.length === 0) return [];
    if (skill.target === "allEnemies" || skill.target === "allAllies") return pool.map((c) => c.id);
    return [pool[Math.floor(this.rng() * pool.length)].id];
  }

  /** Ordre d'exécution : défense en premier, puis vitesse décroissante. */
  sortActions(actions: Action[]): Action[] {
    const key = (a: Action): number => {
      if (a.kind === "defend") return 1000;
      return this.get(a.actorId).stats.spd + this.rng() * 2;
    };
    return [...actions].sort((a, b) => key(b) - key(a));
  }

  // ------------------------------------------------------------------ résolution

  resolve(action: Action): ActionOutcome {
    const actor = this.get(action.actorId);
    const out: ActionOutcome = {
      actorId: actor.id,
      kind: action.kind,
      animation: "",
      message: "",
      lines: [],
      steps: [],
      notes: [],
    };
    if (!actor.alive) {
      out.skipped = "";
      return out;
    }

    if (actor.statuses.sleep) {
      actor.statuses.sleep -= 1;
      if (actor.statuses.sleep <= 0) {
        delete actor.statuses.sleep;
        out.notes.push(`${actor.name} se réveille !`);
      }
      out.skipped = `${actor.name} dort profondément...`;
      return out;
    }
    if (actor.statuses.enrage && action.kind !== "defend" && this.rng() < 0.3) {
      out.skipped = `${actor.name} est trop énervé pour viser !`;
      return out;
    }

    if (action.kind === "defend") {
      actor.defending = true;
      out.animation = "defend";
      out.message = `${actor.name} se met en garde.`;
      return out;
    }
    if (action.kind === "item") return this.resolveItem(actor, action, out);

    const skill = this.skill(action.skillId ?? actor.basicSkill);
    if (actor.stats.mp < skill.mpCost) {
      out.skipped = `${actor.name} n'a pas assez de PM !`;
      return out;
    }
    actor.stats.mp -= skill.mpCost;
    out.animation = skill.animation;
    out.message = skill.message.replace("{user}", actor.name);

    let targets = action.targetIds.map((id) => this.get(id)).filter((t) => t.alive);
    if (targets.length === 0) targets = this.pickTargets(actor, skill).map((id) => this.get(id));
    if (actor.statuses.confuse && this.rng() < 0.5) {
      const anyone = this.combatants.filter((c) => c.alive);
      targets = [anyone[Math.floor(this.rng() * anyone.length)]];
      out.notes.push(`${actor.name} est confus et vise n'importe qui !`);
    }
    if (targets.length === 0) {
      out.skipped = "";
      return out;
    }
    out.message = out.message.replace("{target}", targets[0].name);

    const primary = targets[0];
    const echo = primary.lastQuote ?? "Je suis le plus malin !";
    out.lines = (skill.lines ?? []).map((l) => ({ who: l.who, text: l.text.replace("{echo}", echo) }));
    out.shout = skill.shout;
    const quote = skill.shout ?? skill.lines?.find((l) => l.who === "user")?.text;
    if (quote && !skill.echo) actor.lastQuote = quote;

    const hits = skill.hits ?? 1;
    for (let h = 0; h < hits; h++) {
      for (const t of targets) {
        if (!t.alive) continue;
        const step = this.hit(actor, t, skill);
        if (h === hits - 1 && skill.status && t.alive) this.applyStatus(t, skill, step);
        out.steps.push(step);
      }
    }
    if (out.steps.length > 0) {
      const afflicted = out.steps.filter((s) => s.status);
      for (const s of afflicted) out.notes.push(`${this.get(s.targetId).name} ${STATUS_NAMES[s.status!]} !`);
    }
    return out;
  }

  private resolveItem(actor: Combatant, action: Action, out: ActionOutcome): ActionOutcome {
    const item = this.item(action.itemId ?? "");
    if ((this.inventory[item.id] ?? 0) <= 0) {
      out.skipped = "Il n'en reste plus !";
      return out;
    }
    const targets = action.targetIds.map((id) => this.get(id)).filter((t) => t.alive);
    if (targets.length === 0) {
      out.skipped = "";
      return out;
    }
    this.inventory[item.id] -= 1;
    out.animation = "item";
    out.message = `${actor.name} utilise ${item.name}.`;
    for (const t of targets) {
      const step: StepResult = { targetId: t.id };
      if (item.hp) {
        const before = t.stats.hp;
        t.stats.hp = Math.min(t.stats.maxHp, t.stats.hp + item.hp);
        step.heal = t.stats.hp - before;
      }
      if (item.mp) {
        const before = t.stats.mp;
        t.stats.mp = Math.min(t.stats.maxMp, t.stats.mp + item.mp);
        step.mpRestore = t.stats.mp - before;
      }
      out.steps.push(step);
    }
    return out;
  }

  private hit(attacker: Combatant, target: Combatant, skill: SkillDef): StepResult {
    const variance = 0.9 + this.rng() * 0.2;
    let dmg: number;
    if (skill.kind === "physical") {
      const def = target.stats.def * (target.statuses.enrage ? 0.8 : 1);
      dmg = attacker.stats.atk * skill.power * variance - def * 0.5;
    } else {
      dmg = attacker.stats.atk * skill.power * variance * (40 / (40 + target.stats.mres));
    }
    const crit = this.rng() < 0.05;
    if (crit) dmg *= 1.5;
    if (target.defending) dmg *= 0.5;
    const damage = Math.max(1, Math.round(dmg));
    target.stats.hp = Math.max(0, target.stats.hp - damage);
    const step: StepResult = { targetId: target.id, damage, crit };
    if (target.stats.hp === 0) {
      target.alive = false;
      target.statuses = {};
      step.died = true;
    }
    return step;
  }

  private applyStatus(target: Combatant, skill: SkillDef, step: StepResult): void {
    const st = skill.status;
    if (!st) return;
    const chance = st.chance * Math.max(0, 1 - target.stats.mres / 100);
    if (this.rng() < chance && !target.statuses[st.type]) {
      target.statuses[st.type] = st.turns;
      step.status = st.type;
    } else {
      step.resisted = true;
    }
  }

  /** Fin de manche : régénération de PM, durée des altérations, fin de la garde. */
  endRound(): RoundEvent[] {
    const events: RoundEvent[] = [];
    for (const c of this.combatants) {
      if (!c.alive) continue;
      c.stats.mp = Math.min(c.stats.maxMp, c.stats.mp + 2);
      c.defending = false;
      for (const type of ["enrage", "confuse"] as const) {
        const left = c.statuses[type];
        if (left === undefined) continue;
        if (left <= 1) {
          delete c.statuses[type];
          events.push({ text: type === "enrage" ? `${c.name} se calme.` : `${c.name} retrouve ses esprits.`, targetId: c.id });
        } else {
          c.statuses[type] = left - 1;
        }
      }
    }
    this.turn += 1;
    return events;
  }
}
