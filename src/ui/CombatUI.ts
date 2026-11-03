import Phaser from "phaser";
import { GAME_WIDTH as W } from "../core/constants";
import type { Action, Combatant, SkillDef } from "../combat/CombatAction";
import type { CombatManager } from "../combat/CombatManager";
import { GridMenu, type GridItem } from "./GridMenu";
import { COLORS, FONT, drawPanel } from "./pixelText";

const BAR_W = 84;
const KIND_LABEL: Record<SkillDef["kind"], string> = { physical: "Physique", mental: "Mental", heal: "Soin", support: "Soutien" };
const STATUS_LABEL = { sleep: "sommeil", enrage: "énervement", confuse: "confusion" } as const;
const TAG: Record<string, { text: string; color: string }> = {
  sleep: { text: "zZ", color: "#9ad0ff" },
  enrage: { text: "#!", color: "#ff4455" },
  confuse: { text: "?!", color: "#ffd84a" },
};

interface Row {
  hpFill: Phaser.GameObjects.Rectangle;
  mpFill: Phaser.GameObjects.Rectangle;
  hpText: Phaser.GameObjects.Text;
  mpText: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  tag: Phaser.GameObjects.Text;
}

function barColor(ratio: number): number {
  return ratio > 0.5 ? 0x6fcf5a : ratio > 0.25 ? 0xf2c14e : 0xe8475a;
}

/** Interface du combat : état de l'équipe, boss, messages et menus de commande. */
export class CombatUI {
  private rows = new Map<string, Row>();
  private shown = new Map<string, { hp: number; mp: number }>();
  private enemyBars = new Map<string, { fill: Phaser.GameObjects.Rectangle; name: Phaser.GameObjects.Text }>();
  private tags = new Map<string, Phaser.GameObjects.Text>();
  private msgBox: Phaser.GameObjects.Container;
  private msgText: Phaser.GameObjects.Text;
  private title: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly cm: CombatManager,
    private readonly party: Combatant[],
    private readonly enemies: Combatant[],
    anchors: Map<string, { x: number; y: number }>,
  ) {
    drawPanel(scene, 6, 182, 226, 82).setDepth(50);
    drawPanel(scene, 238, 182, 236, 82).setDepth(50);

    party.forEach((m, i) => {
      const y = 190 + i * 38;
      const name = this.text(14, y, m.name, COLORS.cream);
      this.text(14, y + 12, "PV", COLORS.grey);
      this.text(14, y + 24, "PM", COLORS.grey);
      scene.add.rectangle(36, y + 16, BAR_W, 6, 0x1a1340).setOrigin(0, 0.5).setDepth(51);
      scene.add.rectangle(36, y + 28, BAR_W, 6, 0x1a1340).setOrigin(0, 0.5).setDepth(51);
      const hpFill = scene.add.rectangle(36, y + 16, BAR_W, 6, 0x6fcf5a).setOrigin(0, 0.5).setDepth(52);
      const mpFill = scene.add.rectangle(36, y + 28, BAR_W, 6, 0x5aa0ff).setOrigin(0, 0.5).setDepth(52);
      const hpText = this.text(130, y + 12, "", COLORS.cream);
      const mpText = this.text(130, y + 24, "", COLORS.cream);
      const tag = this.text(190, y, "", COLORS.cream);
      this.rows.set(m.id, { hpFill, mpFill, hpText, mpText, name, tag });
    });

    enemies.forEach((e, i) => {
      drawPanel(scene, W - 178, 40 + i * 30, 170, 28).setDepth(50);
      const y = 46 + i * 30;
      const name = this.text(W - 170, y, e.name, COLORS.cream);
      scene.add.rectangle(W - 170, y + 15, 154, 6, 0x1a1340).setOrigin(0, 0.5).setDepth(51);
      const fill = scene.add.rectangle(W - 170, y + 15, 154, 6, 0xe8475a).setOrigin(0, 0.5).setDepth(52);
      this.enemyBars.set(e.id, { fill, name });
    });

    const bg = scene.add.graphics();
    bg.fillStyle(0x0f0a26, 0.92).fillRect(60, 4, W - 120, 30);
    bg.lineStyle(2, 0xf4efc8).strokeRect(61, 5, W - 122, 28);
    this.msgText = scene.add.text(W / 2, 19, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.cream, align: "center", wordWrap: { width: W - 140 } }).setOrigin(0.5);
    this.msgBox = scene.add.container(0, 0, [bg, this.msgText]).setDepth(120).setVisible(false);

    this.title = this.text(248, 190, "", COLORS.green).setDepth(70);
    this.hint = this.text(248, 250, "", COLORS.grey).setDepth(70);

    for (const c of [...party, ...enemies]) {
      const a = anchors.get(c.id);
      if (a) this.tags.set(c.id, scene.add.text(a.x, a.y, "", { fontFamily: FONT, fontSize: "8px", color: "#ffffff", stroke: "#0f0a26", strokeThickness: 3 }).setOrigin(0.5).setDepth(110));
    }
    this.refresh();
  }

  private text(x: number, y: number, s: string, color: string): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, s, { fontFamily: FONT, fontSize: "8px", color }).setDepth(60);
  }

  // ------------------------------------------------------------------ affichage de l'état

  message(text: string): void {
    this.msgText.setText(text);
    this.msgBox.setVisible(true);
  }

  hideMessage(): void {
    this.msgBox.setVisible(false);
  }

  /** Synchronise l'affichage avec l'état réel du combat. */
  refresh(): void {
    for (const c of [...this.party, ...this.enemies]) this.shown.set(c.id, { hp: c.stats.hp, mp: c.stats.mp });
    this.draw();
  }

  /** Applique un changement visible au moment de l'impact (le moteur est déjà à l'état final). */
  shift(id: string, d: { hp?: number; mp?: number }): void {
    const s = this.shown.get(id);
    const c = [...this.party, ...this.enemies].find((x) => x.id === id);
    if (!s || !c) return;
    s.hp = Phaser.Math.Clamp(s.hp + (d.hp ?? 0), 0, c.stats.maxHp);
    s.mp = Phaser.Math.Clamp(s.mp + (d.mp ?? 0), 0, c.stats.maxMp);
    this.draw();
  }

  private draw(): void {
    for (const m of this.party) {
      const r = this.rows.get(m.id)!;
      const s = this.shown.get(m.id)!;
      const hpRatio = s.hp / m.stats.maxHp;
      r.hpFill.setSize(Math.max(0, BAR_W * hpRatio), 6).setFillStyle(barColor(hpRatio));
      r.mpFill.setSize(Math.max(0, BAR_W * (s.mp / m.stats.maxMp)), 6);
      r.hpText.setText(`${s.hp}/${m.stats.maxHp}`);
      r.mpText.setText(`${s.mp}/${m.stats.maxMp}`);
      r.name.setColor(m.alive ? r.name.style.color : COLORS.grey);
    }
    for (const e of this.enemies) {
      const b = this.enemyBars.get(e.id)!;
      b.fill.setSize(Math.max(0, 154 * (this.shown.get(e.id)!.hp / e.stats.maxHp)), 6);
    }
    this.refreshTags();
  }

  refreshTags(): void {
    for (const c of [...this.party, ...this.enemies]) {
      const t = this.tags.get(c.id);
      if (!t) continue;
      const status = (Object.keys(c.statuses) as Array<keyof typeof STATUS_LABEL>)[0];
      const tag = c.alive && status ? TAG[status] : undefined;
      t.setText(tag?.text ?? "").setColor(tag?.color ?? "#ffffff");
    }
  }

  highlight(id: string | null): void {
    for (const [pid, r] of this.rows) r.name.setColor(pid === id ? COLORS.green : COLORS.cream);
  }

  // ------------------------------------------------------------------ choix du joueur

  private menu<T>(columns: Array<GridItem<T>[]>, o: { colWidth?: number; cancelable?: boolean } = {}): Promise<T | null> {
    return new Promise((resolve) => {
      const close = (v: T | null) => {
        m.destroy();
        this.hint.setText("");
        resolve(v);
      };
      const m: GridMenu<T> = new GridMenu<T>(this.scene, 264, 208, columns, {
        colWidth: o.colWidth ?? 112,
        lineHeight: 12,
        depth: 70,
        onPick: (it) => close(it.value),
        onCancel: o.cancelable ? () => close(null) : undefined,
        onHover: (it) => this.hint.setText(it.hint ?? ""),
      });
    });
  }

  private skillHint(s: SkillDef): string {
    const st = s.status ? ` +${STATUS_LABEL[s.status.type]}` : "";
    return `${s.mpCost} PM  ${KIND_LABEL[s.kind]}${st}`.slice(0, 29);
  }

  private async pickTargets(actor: Combatant, target: SkillDef["target"] | "ally" | "allAllies"): Promise<string[] | null> {
    const pool = this.cm.validTargets(actor, target);
    if (target === "allEnemies" || target === "allAllies") return pool.map((c) => c.id);
    if (target === "self") return [actor.id];
    if (pool.length === 1) return [pool[0].id];
    const id = await this.menu([pool.map((c) => ({ label: c.name, value: c.id }))], { cancelable: true, colWidth: 200 });
    return id ? [id] : null;
  }

  /** Demande l'action d'un membre de l'équipe. Renvoie « back » pour revenir au membre précédent. */
  async pickAction(actor: Combatant, canGoBack: boolean): Promise<Action | "back"> {
    this.highlight(actor.id);
    this.title.setText(`${actor.name} : que faire ?`);
    try {
      for (;;) {
        const cmd = await this.menu<string>(
          [
            [
              { label: "Attaquer", value: "attack", hint: "Attaque de base, sans PM" },
              { label: "Compétences", value: "skills", hint: "Utiliser des PM" },
              ...(canGoBack ? [{ label: "Retour", value: "back", hint: "Changer le choix précédent" }] : []),
            ],
            [
              { label: "Défense", value: "defend", hint: "Réduit les dégâts reçus" },
              { label: "Objets", value: "items", hint: "Utiliser un objet" },
            ],
          ],
          { cancelable: canGoBack, colWidth: 112 },
        );
        if (cmd === null || cmd === "back") return "back";

        if (cmd === "defend") return { actorId: actor.id, kind: "defend", targetIds: [] };

        if (cmd === "attack") {
          const skill = this.cm.skill(actor.basicSkill);
          const targets = await this.pickTargets(actor, skill.target);
          if (targets) return { actorId: actor.id, kind: "attack", skillId: skill.id, targetIds: targets };
          continue;
        }

        if (cmd === "skills") {
          const defs = actor.skills.map((id) => this.cm.skill(id));
          const toItem = (s: SkillDef): GridItem<string> => ({
            label: s.name,
            value: s.id,
            disabled: s.mpCost > actor.stats.mp,
            hint: s.mpCost > actor.stats.mp ? "Pas assez de PM" : this.skillHint(s),
          });
          const columns = [defs.filter((s) => s.kind === "physical").map(toItem), defs.filter((s) => s.kind !== "physical").map(toItem)];
          const id = await this.menu(columns, { cancelable: true });
          if (!id) continue;
          const skill = this.cm.skill(id);
          const targets = await this.pickTargets(actor, skill.target);
          if (targets) return { actorId: actor.id, kind: "skill", skillId: id, targetIds: targets };
          continue;
        }

        // objets
        const owned = Object.entries(this.cm.inventory).filter(([, n]) => n > 0);
        if (owned.length === 0) {
          this.hint.setText("Aucun objet.");
          continue;
        }
        const itemId = await this.menu(
          [owned.map(([id, n]) => ({ label: `${this.cm.item(id).name} x${n}`, value: id, hint: this.cm.item(id).description }))],
          { cancelable: true, colWidth: 200 },
        );
        if (!itemId) continue;
        const targets = await this.pickTargets(actor, this.cm.item(itemId).target);
        if (targets) return { actorId: actor.id, kind: "item", itemId, targetIds: targets };
      }
    } finally {
      this.title.setText("");
      this.highlight(null);
    }
  }
}
