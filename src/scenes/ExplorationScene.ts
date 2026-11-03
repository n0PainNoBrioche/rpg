import Phaser from "phaser";
import { GAME_HEIGHT as H, GAME_WIDTH as W } from "../core/constants";
import { gameState } from "../core/GameState";
import { EventRunner, type Action, type EventDef, type EventHost } from "../core/EventRunner";
import { audio } from "../audio/AudioManager";
import { levelRegistry } from "../levels/levelRegistry";
import type { LevelDefinition } from "../levels/LevelDefinition";
import type { BattleResult } from "../combat/CombatManager";
import { ParallaxCity } from "../ui/ParallaxCity";
import { DialogueBox } from "../ui/DialogueBox";
import { MobileControls } from "../ui/MobileControls";
import { COLORS, FONT, pixelText } from "../ui/pixelText";

const GROUND_TOP = 218;
const FEET_Y = 234;
const SPEED = 72;
const INTERACT_RANGE = 36;

interface ActorRef {
  id: string;
  texture: string;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  down: boolean;
}

/** Scène de niveau en vue de côté : marche, interactions, cinématiques pilotées par des événements JSON. */
export class ExplorationScene extends Phaser.Scene implements EventHost {
  aborted = false;
  private levelId = "";
  private level!: LevelDefinition;
  private runner!: EventRunner;
  private dialogue!: DialogueBox;
  private controls!: MobileControls;
  private city!: ParallaxCity;
  private actors = new Map<string, ActorRef>();
  private targets = new Map<string, Phaser.GameObjects.Sprite>();
  private player!: ActorRef;
  private hint!: Phaser.GameObjects.Text;
  private objective!: Phaser.GameObjects.Text;
  private keys!: Record<"left" | "right" | "a" | "d" | "q", Phaser.Input.Keyboard.Key>;
  /** Appui sur une touche d'action, mémorisé jusqu'à la prochaine image (jamais pendant un dialogue). */
  private actionPressed = false;

  constructor() {
    super("ExplorationScene");
  }

  init(data: { levelId: string }): void {
    this.levelId = data.levelId;
  }

  create(): void {
    const level = levelRegistry[this.levelId];
    const save = gameState.save;
    if (!level || !save) {
      this.scene.start("MenuScene");
      return;
    }
    this.level = level;
    this.aborted = false;
    this.actors = new Map();
    this.targets = new Map();
    this.events.once("shutdown", () => (this.aborted = true));
    this.events.on("wake", () => audio.playMusic(level.music));

    const cam = this.cameras.main;
    cam.setBounds(0, 0, level.worldWidth, H);
    this.city = new ParallaxCity(this, level.worldWidth, GROUND_TOP);
    this.buildProps();
    this.buildActors();

    this.add.image(0, 0, "vignette").setOrigin(0).setDisplaySize(W, H).setScrollFactor(0).setDepth(30);
    this.hint = pixelText(this, 0, 0, "!", 8, COLORS.green).setDepth(40).setVisible(false);
    this.objective = this.add
      .text(8, 8, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.cream, backgroundColor: "#0f0a26cc", padding: { x: 4, y: 3 } })
      .setScrollFactor(0)
      .setDepth(50)
      .setVisible(false);

    const kb = this.input.keyboard!;
    this.keys = {
      left: kb.addKey("LEFT"),
      right: kb.addKey("RIGHT"),
      a: kb.addKey("A"),
      d: kb.addKey("D"),
      q: kb.addKey("Q"),
    };
    this.actionPressed = false;
    const onActionKey = (e: KeyboardEvent): void => {
      if (e.repeat || !["Space", "Enter", "KeyZ"].includes(e.code)) return;
      // Un appui qui sert à valider un dialogue ne doit jamais relancer une interaction.
      if (this.runner?.busy || this.dialogue?.active) return;
      this.actionPressed = true;
    };
    kb.on("keydown", onActionKey);
    this.events.once("shutdown", () => kb.off("keydown", onActionKey));
    this.dialogue = new DialogueBox(this, level.dialogues.speakers, save.pseudo);
    this.controls = new MobileControls(this);

    this.runner = new EventRunner(this, level.events);
    // Position de départ (débogage : ?startX=1100 saute les zones déjà passées)
    const startParam = Number(new URLSearchParams(location.search).get("startX"));
    if (Number.isFinite(startParam) && startParam > 0) {
      this.player.sprite.x = startParam;
      for (const ev of level.events) if (ev.trigger.type === "zone" && ev.trigger.x < startParam) this.runner.markDone(ev.id);
    }
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setScroll(Phaser.Math.Clamp(this.player.sprite.x - W / 2, 0, level.worldWidth - W), 0);

    audio.playMusic(level.music);
    for (const ev of level.events) if (ev.trigger.type === "auto") void this.fire(ev);
  }

  // ------------------------------------------------------------------ construction du décor

  private buildProps(): void {
    for (const p of this.level.props) {
      const sprite = this.add.sprite(p.x, FEET_Y - 4, `prop_${p.type}`).setOrigin(0.5, 1).setDepth(5);
      this.targets.set(p.id, sprite);
      if (p.type === "stall") pixelText(this, p.x, FEET_Y - 76, "PHARMA", 8, COLORS.green).setDepth(6);
      if (p.glow) {
        const halo = this.add.image(p.x + 5, FEET_Y - 58, "glow").setScale(3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.55).setDepth(15);
        this.add.image(p.x, FEET_Y - 2, "glow").setScale(3.4, 0.9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.28).setDepth(4);
        this.tweens.add({ targets: halo, alpha: 0.42, duration: 900 + (p.x % 400), yoyo: true, repeat: -1 });
      }
    }
    // Poteaux au premier plan : ils défilent plus vite que la caméra et donnent de la profondeur.
    for (let x = 300; x < this.level.worldWidth * 1.4; x += 760) {
      this.add.image(x, 0, "prop_pole").setOrigin(0.5, 0).setAlpha(0.9).setScrollFactor(1.4).setDepth(20);
    }
  }

  private buildActors(): void {
    const hero = this.makeActor("hero", "hero", this.level.playerStart, 2, 1, false);
    this.player = hero;
    for (const a of this.level.actors) this.makeActor(a.id, a.texture, a.x, a.scale ?? 2, a.facing ?? 1, a.pose === "down");
  }

  private makeActor(id: string, texture: string, x: number, scale: number, facing: 1 | -1, down: boolean): ActorRef {
    const shadow = this.add.image(x, FEET_Y + 1, "shadow").setDepth(9).setScale(scale * 0.9, 1);
    const sprite = this.add.sprite(x, FEET_Y, texture).setScale(scale).setDepth(10).setFlipX(facing < 0);
    const ref: ActorRef = { id, texture, sprite, shadow, down: false };
    this.actors.set(id, ref);
    this.targets.set(id, sprite);
    if (down) this.setDown(ref, true);
    else sprite.setOrigin(0.5, 1);
    return ref;
  }

  private setDown(a: ActorRef, down: boolean): void {
    a.down = down;
    const s = a.sprite;
    if (down) {
      s.setOrigin(0.5, 0.5).setAngle(90);
      s.setY(FEET_Y - s.displayWidth / 2);
    } else {
      s.setOrigin(0.5, 1).setAngle(0).setY(FEET_Y);
    }
  }

  // ------------------------------------------------------------------ boucle

  update(): void {
    if (this.aborted || !this.level) return;
    const cam = this.cameras.main;
    this.city.update(cam.scrollX);
    for (const a of this.actors.values()) a.shadow.setPosition(a.sprite.x, FEET_Y + 1).setVisible(a.sprite.visible && !a.down);

    const busy = this.runner.busy || this.dialogue.active;
    const p = this.player.sprite;
    if (busy) {
      this.actionPressed = false;
      this.controls.consumeAction();
      if (p.anims.isPlaying && !this.walkingScripted) this.stopWalk(this.player);
      this.hint.setVisible(false);
      return;
    }

    const k = this.keys;
    const left = k.left.isDown || k.a.isDown || k.q.isDown || this.controls.left;
    const right = k.right.isDown || k.d.isDown || this.controls.right;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0) {
      const dt = this.game.loop.delta / 1000;
      p.x = Phaser.Math.Clamp(p.x + dir * SPEED * dt, 24, this.level.worldWidth - 24);
      p.setFlipX(dir < 0);
      if (!p.anims.isPlaying) p.play("hero-walk");
    } else if (p.anims.isPlaying) {
      this.stopWalk(this.player);
    }

    for (const ev of this.level.events) {
      if (ev.trigger.type === "zone" && p.x >= ev.trigger.x && this.runner.canRun(ev)) {
        void this.fire(ev);
        return;
      }
    }

    const target = this.nearestInteractable();
    const action = this.actionPressed || this.controls.consumeAction();
    this.actionPressed = false;
    if (target) {
      const spr = this.targets.get(target.trigger.type === "interact" ? target.trigger.target : "")!;
      this.hint.setVisible(true).setPosition(spr.x, spr.getBounds().top - 8 + Math.sin(this.time.now / 160) * 2);
      if (action) void this.fire(target);
    } else {
      this.hint.setVisible(false);
    }
  }

  private nearestInteractable(): EventDef | null {
    const px = this.player.sprite.x;
    let best: EventDef | null = null;
    let bestD = INTERACT_RANGE;
    for (const ev of this.level.events) {
      if (ev.trigger.type !== "interact" || !this.runner.canRun(ev)) continue;
      const spr = this.targets.get(ev.trigger.target);
      if (!spr) continue;
      const d = Math.abs(spr.x - px);
      if (d < bestD) {
        bestD = d;
        best = ev;
      }
    }
    return best;
  }

  private async fire(ev: EventDef): Promise<void> {
    try {
      await this.runner.runEvent(ev);
    } catch (err) {
      console.error(`Événement « ${ev.id} » interrompu`, err);
    }
  }

  private walkingScripted = false;

  private stopWalk(a: ActorRef): void {
    a.sprite.anims.stop();
    a.sprite.setTexture(a.texture);
  }

  // ------------------------------------------------------------------ hôte d'événements

  choose(labels: string[]): Promise<number> {
    this.controls.setVisible(false);
    this.objective.setVisible(false);
    return this.dialogue.choose(labels).finally(() => {
      this.controls.setVisible(true);
      this.objective.setVisible(this.objective.text !== "");
    });
  }

  async perform(a: Action): Promise<void> {
    switch (a.type) {
      case "dialogue": {
        const lines = this.level.dialogues.scenes[a.id];
        if (!lines) throw new Error(`Dialogue inconnu : ${a.id}`);
        this.controls.setVisible(false);
        this.objective.setVisible(false);
        await this.dialogue.play(lines);
        if (!this.aborted) {
          this.controls.setVisible(true);
          this.objective.setVisible(this.objective.text !== "");
        }
        return;
      }
      case "wait":
        return this.sleepMs(a.ms);
      case "objective":
        this.objective.setText(a.text).setVisible(a.text !== "");
        return;
      case "shake":
        this.cameras.main.shake(a.duration, a.intensity);
        return this.sleepMs(a.duration);
      case "cameraPan":
        this.cameras.main.stopFollow();
        this.cameras.main.pan(a.x, H / 2, a.duration, "Sine.easeInOut", true);
        return this.sleepMs(a.duration + 50);
      case "cameraFollow":
        this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
        return;
      case "sfx":
        audio.playSfx(a.key);
        return;
      case "music":
        audio.playMusic(a.key);
        return;
      case "actor":
        return this.actorAnim(a);
      case "battle": {
        const result = await this.runBattle(a.encounter);
        if (result === "defeat") await this.perform({ type: "gameOver", variant: "defeat" });
        return;
      }
      case "completeLevel":
        this.aborted = true;
        audio.stopMusic();
        this.scene.start("LevelCompleteScene", { levelId: this.levelId });
        return;
      case "gameOver":
        this.aborted = true;
        audio.stopMusic();
        this.scene.start("GameOverScene", { variant: a.variant, levelId: this.levelId });
        return;
      default:
        throw new Error(`Action non gérée par la scène : ${a.type}`);
    }
  }

  private sleepMs(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private tweenTo(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: () => resolve() }));
  }

  private runBattle(encounterId: string): Promise<BattleResult> {
    return new Promise((resolve) => {
      this.scene.launch("BattleScene", {
        levelId: this.levelId,
        encounterId,
        onEnd: (result: BattleResult) => {
          this.scene.stop("BattleScene");
          this.scene.wake();
          audio.playMusic(this.level.music);
          resolve(result);
        },
      });
      this.scene.sleep();
    });
  }

  private async actorAnim(a: Extract<Action, { type: "actor" }>): Promise<void> {
    const ref = this.actors.get(a.id);
    if (!ref) throw new Error(`Personnage inconnu : ${a.id}`);
    const s = ref.sprite;
    switch (a.anim) {
      case "walkTo": {
        const x = a.x ?? s.x;
        s.setFlipX(x < s.x);
        const duration = (Math.abs(x - s.x) / SPEED) * 1000;
        this.walkingScripted = true;
        s.play(`${ref.texture}-walk`);
        await this.tweenTo({ targets: s, x, duration, ease: "Linear" });
        this.stopWalk(ref);
        this.walkingScripted = false;
        return;
      }
      case "standUp": {
        const targetY = FEET_Y - s.displayHeight / 2;
        await this.tweenTo({ targets: s, angle: 0, y: targetY, duration: 600, ease: "Back.easeOut" });
        this.setDown(ref, false);
        await this.tweenTo({ targets: s, y: FEET_Y - 8, duration: 120, yoyo: true });
        return;
      }
      case "hurt": {
        audio.playSfx("hurt");
        s.setTintFill(0xffffff);
        await this.sleepMs(90);
        s.clearTint();
        await this.tweenTo({ targets: s, angle: -14, scaleY: s.scaleY * 0.9, duration: 250, ease: "Sine.easeOut" });
        return;
      }
      case "flee": {
        s.setAngle(0).setFlipX(false);
        this.tweens.add({ targets: s, y: FEET_Y - 5, duration: 100, yoyo: true, repeat: -1 });
        await this.tweenTo({ targets: s, x: a.x ?? s.x + 400, duration: a.duration ?? 1000, ease: "Quad.easeIn" });
        s.setVisible(false);
        this.tweens.killTweensOf(s);
        return;
      }
      case "joy": {
        audio.playSfx("heal");
        for (let i = 0; i < 4; i++) {
          const h = this.add.image(s.x + Phaser.Math.Between(-14, 14), s.y - s.displayHeight, "heart").setScale(1.5).setDepth(40);
          this.tweens.add({ targets: h, y: h.y - 30, alpha: 0, duration: 900, delay: i * 120, onComplete: () => h.destroy() });
        }
        await this.tweenTo({ targets: s, y: s.y - 14, duration: 150, yoyo: true, repeat: 2 });
        return;
      }
      case "embarrassed": {
        s.setTint(0xffb0c8);
        await this.tweenTo({ targets: s, x: s.x + 2, duration: 50, yoyo: true, repeat: 8 });
        s.clearTint();
        return;
      }
      case "face":
        s.setFlipX((a.x ?? 1) < 0);
        return;
      default:
        throw new Error(`Animation inconnue : ${a.anim}`);
    }
  }
}
