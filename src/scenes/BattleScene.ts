import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/constants";
import { gameState } from "../core/GameState";
import { audio } from "../audio/AudioManager";
import { levelRegistry } from "../levels/levelRegistry";
import { createEnemy, createPartyMember } from "../characters/Character";
import type { Action, ActionOutcome, Combatant, ItemDef, SkillDef } from "../combat/CombatAction";
import { CombatManager, type BattleResult } from "../combat/CombatManager";
import { BattleFx } from "../combat/CombatEffects";
import skillData from "../combat/data/skills.json";
import itemData from "../combat/data/items.json";
import { createBattleBackdrop } from "../ui/BattleBackdrop";
import { CombatUI } from "../ui/CombatUI";
import { COLORS, FONT } from "../ui/pixelText";

interface BattleData {
  levelId: string;
  encounterId: string;
  onEnd: (result: BattleResult) => void;
}

const PARTY_POS = [
  { x: 100, y: 150 },
  { x: 164, y: 168 },
];
const ENEMY_X = 372;
const ENEMY_Y = 160;

function withIds<T extends object>(src: Record<string, T>): Record<string, T & { id: string }> {
  return Object.fromEntries(Object.entries(src).map(([id, v]) => [id, { ...v, id }]));
}

/** Combat au tour par tour : la logique est dans CombatManager, cette scène ne fait que la mettre en scène. */
export class BattleScene extends Phaser.Scene {
  private data0!: BattleData;
  private cm!: CombatManager;
  private ui!: CombatUI;
  private fx!: BattleFx;
  private party: Combatant[] = [];
  private enemies: Combatant[] = [];
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private done = false;

  constructor() {
    super("BattleScene");
  }

  init(data: BattleData): void {
    this.data0 = data;
  }

  create(): void {
    this.done = false;
    this.sprites = new Map();
    const level = levelRegistry[this.data0.levelId];
    const save = gameState.save;
    const encounter = level?.enemies.encounters[this.data0.encounterId];
    if (!level || !save || !encounter) {
      this.data0.onEnd("victory");
      return;
    }
    const skills = { ...withIds(skillData as unknown as Record<string, Omit<SkillDef, "id">>), ...withIds(level.enemies.skills) } as Record<string, SkillDef>;
    const items = withIds(itemData as unknown as Record<string, Omit<ItemDef, "id">>) as Record<string, ItemDef>;
    this.party = level.party.map((id) => createPartyMember(id, save.pseudo));
    this.enemies = encounter.enemies.map((id) => createEnemy(id, level.enemies.enemies[id]));
    this.cm = new CombatManager([...this.party, ...this.enemies], skills, items, { ...level.startingItems });

    createBattleBackdrop(this);
    this.fx = new BattleFx(this);
    const anchors = new Map<string, { x: number; y: number }>();
    const place = (c: Combatant, x: number, y: number) => {
      this.add.image(x, y + 1, "shadow").setScale(c.scale * 0.6, 1.4).setDepth(9);
      const s = this.add.sprite(x, y, c.texture).setOrigin(0.5, 1).setScale(c.scale).setDepth(10 + y / 100);
      if (c.side === "enemy") s.setFlipX(true);
      this.sprites.set(c.id, s);
      anchors.set(c.id, { x, y: y - s.displayHeight - 10 });
      this.tweens.add({ targets: s, y: y - 2, duration: 520, yoyo: true, repeat: -1, ease: "Stepped", delay: Phaser.Math.Between(0, 300) });
    };
    this.party.forEach((c, i) => place(c, PARTY_POS[i].x, PARTY_POS[i].y));
    this.enemies.forEach((c, i) => place(c, ENEMY_X - i * 56, ENEMY_Y + (i % 2) * 8));
    this.ui = new CombatUI(this, this.cm, this.party, this.enemies, anchors);

    audio.playMusic(encounter.music);
    void this.run(encounter.intro).catch((err) => console.error("Erreur de combat", err));
  }

  // ------------------------------------------------------------------ déroulement

  private async run(intro: string): Promise<void> {
    for (const e of this.enemies) {
      const s = this.sprites.get(e.id)!;
      const x = s.x;
      s.x += 220;
      this.tweens.add({ targets: s, x, duration: 600, ease: "Cubic.easeOut" });
    }
    await this.fx.wait(700);
    this.ui.message(intro);
    await this.fx.wait(1200);

    for (;;) {
      this.ui.hideMessage();
      const plan = await this.planParty();
      const all = this.cm.sortActions([...plan, ...this.cm.planEnemyActions()]);
      for (const action of all) {
        if (!this.cm.get(action.actorId).alive) continue;
        const before = this.cm.get(action.actorId).stats.mp;
        const out = this.cm.resolve(action);
        await this.present(out, this.cm.get(action.actorId).stats.mp - before);
        const res = this.cm.result();
        if (res) return this.finish(res);
      }
      const events = this.cm.endRound();
      this.ui.refresh();
      for (const ev of events) {
        this.ui.message(ev.text);
        await this.fx.wait(700);
      }
    }
  }

  private async planParty(): Promise<Action[]> {
    const alive = this.party.filter((m) => m.alive);
    const awake = alive.filter((m) => !m.statuses.sleep);
    const plan: Action[] = [];
    // Un membre endormi « passe » son tour, ce qui fait avancer son sommeil.
    for (const m of alive.filter((x) => x.statuses.sleep)) plan.push({ actorId: m.id, kind: "defend", targetIds: [] });
    const chosen: Action[] = [];
    let i = 0;
    while (i < awake.length) {
      const res = await this.ui.pickAction(awake[i], i > 0);
      if (res === "back") {
        chosen.pop();
        i--;
        continue;
      }
      chosen[i] = res;
      i++;
    }
    return [...plan, ...chosen];
  }

  private async present(out: ActionOutcome, mpDelta: number): Promise<void> {
    const actor = this.cm.get(out.actorId);
    if (out.skipped !== undefined) {
      if (out.skipped) {
        this.ui.message(out.skipped);
        await this.fx.wait(900);
      }
      for (const n of out.notes) {
        this.ui.message(n);
        await this.fx.wait(700);
      }
      this.ui.refreshTags();
      return;
    }
    this.ui.message(out.message);
    if (mpDelta !== 0) this.ui.shift(actor.id, { mp: mpDelta });
    await this.fx.wait(450);

    const userSprite = this.sprites.get(actor.id)!;
    const stepSprites = out.steps.map((s) => this.sprites.get(s.targetId)!);
    const targets = [...new Set(stepSprites)];
    await this.fx.play(out.animation, {
      user: userSprite,
      targets: targets.length > 0 ? targets : [userSprite],
      steps: out.steps.length,
      lines: out.lines,
      shout: out.shout,
      userIsParty: actor.side === "party",
      impact: (i) => this.impact(out, i),
    });
    for (const n of out.notes) {
      this.ui.message(n);
      await this.fx.wait(700);
    }
    this.ui.refresh();
  }

  /** Effet visuel et sonore d'un coup, au moment où il touche. */
  private impact(out: ActionOutcome, i: number): void {
    const step = out.steps[i];
    const target = this.cm.get(step.targetId);
    const spr = this.sprites.get(step.targetId)!;
    const top = spr.y - spr.displayHeight;
    if (step.damage !== undefined) {
      audio.playSfx(step.crit ? "crit" : "hit");
      spr.setTintFill(0xffffff);
      this.time.delayedCall(80, () => spr.clearTint());
      this.tweens.add({ targets: spr, x: spr.x + (target.side === "party" ? -5 : 5), duration: 45, yoyo: true, repeat: 2 });
      this.fx.float(spr.x, top + 10, `${step.damage}${step.crit ? "!" : ""}`, step.crit ? "#ffd84a" : "#ffffff", step.crit ? 16 : 12);
      this.ui.shift(target.id, { hp: -step.damage });
      if (step.died) this.onDeath(target, spr);
    }
    if (step.heal) {
      this.fx.float(spr.x, top + 10, `+${step.heal}`, "#8fe070", 12);
      this.ui.shift(target.id, { hp: step.heal });
    }
    if (step.mpRestore) {
      this.fx.float(spr.x, top + 24, `+${step.mpRestore} PM`, "#7ab8ff", 8);
      this.ui.shift(target.id, { mp: step.mpRestore });
    }
    if (step.status) {
      const label = { sleep: "ENDORMI !", enrage: "ÉNERVÉ !", confuse: "CONFUS !" }[step.status];
      this.fx.float(spr.x, top - 6, label, "#ffd84a", 8);
      this.ui.refreshTags();
    } else if (step.resisted) {
      this.fx.float(spr.x, top - 6, "Résiste !", "#bbbbcc", 8);
    }
  }

  private onDeath(c: Combatant, spr: Phaser.GameObjects.Sprite): void {
    this.tweens.killTweensOf(spr);
    if (c.side === "party") {
      this.tweens.add({ targets: spr, angle: 90, y: spr.y - 4, alpha: 0.7, duration: 400 });
      return;
    }
    // Défaite d'un ennemi : clignotement blanc puis disparition.
    let n = 0;
    this.time.addEvent({
      delay: 90,
      repeat: 7,
      callback: () => {
        n++;
        if (n % 2) spr.setTintFill(0xffffff);
        else spr.clearTint();
      },
    });
    this.tweens.add({ targets: spr, alpha: 0, scaleY: spr.scaleY * 0.2, y: spr.y, delay: 750, duration: 500 });
  }

  private async finish(result: BattleResult): Promise<void> {
    if (this.done) return;
    this.done = true;
    this.ui.refresh();
    await this.fx.wait(1000);
    audio.stopMusic();
    const banner = this.add
      .text(W / 2, 96, result === "victory" ? "VICTOIRE !" : "DÉFAITE...", {
        fontFamily: FONT,
        fontSize: "24px",
        color: result === "victory" ? COLORS.green : COLORS.red,
        stroke: "#0f0a26",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setScale(0.2);
    this.tweens.add({ targets: banner, scale: 1, duration: 350, ease: "Back.easeOut" });
    if (result === "victory") {
      audio.playMusic("victory");
      for (const c of this.party.filter((m) => m.alive)) {
        const s = this.sprites.get(c.id)!;
        this.tweens.add({ targets: s, y: s.y - 14, duration: 180, yoyo: true, repeat: 3, ease: "Sine.easeOut" });
      }
    } else {
      audio.playMusic("gameover");
    }
    await this.fx.wait(2600);
    this.data0.onEnd(result);
  }
}
