/**
 * Moteur d'événements : exécute des listes d'actions décrites en JSON.
 * Les actions de flux (flag, branche, choix) sont gérées ici ; les autres sont déléguées à l'hôte (la scène).
 */
export type Action =
  | { type: "dialogue"; id: string }
  | { type: "setFlag"; flag: string }
  | { type: "branch"; flag: string; then: Action[]; else?: Action[] }
  | { type: "choice"; options: Array<{ label: string; then: Action[] }> }
  | { type: "battle"; encounter: string }
  | { type: "cameraPan"; x: number; duration: number }
  | { type: "cameraFollow" }
  | { type: "shake"; duration: number; intensity: number }
  | { type: "wait"; ms: number }
  | { type: "objective"; text: string }
  | { type: "actor"; id: string; anim: string; x?: number; duration?: number }
  | { type: "sfx"; key: string }
  | { type: "music"; key: string }
  | { type: "completeLevel" }
  | { type: "gameOver"; variant: "feur" | "defeat" };

export type EventTrigger =
  | { type: "auto" }
  /** Se déclenche quand le joueur atteint (ou dépasse) la position x. */
  | { type: "zone"; x: number }
  /** Se déclenche sur appui du bouton d'action près d'un décor ou personnage. */
  | { type: "interact"; target: string };

export interface EventDef {
  id: string;
  trigger: EventTrigger;
  once?: boolean;
  /** Identifiants d'événements qui doivent déjà avoir été joués. */
  requires?: string[];
  actions: Action[];
}

export interface EventHost {
  perform(action: Action): Promise<void>;
  choose(labels: string[]): Promise<number>;
  /** Vrai quand la scène a changé : on arrête d'enchaîner les actions. */
  readonly aborted: boolean;
}

export class EventRunner {
  readonly flags = new Set<string>();
  private readonly done = new Set<string>();
  private running = false;

  constructor(
    private readonly host: EventHost,
    readonly events: EventDef[],
  ) {}

  get busy(): boolean {
    return this.running;
  }

  /** Marque un événement comme déjà joué (test / reprise à une position donnée). */
  markDone(id: string): void {
    this.done.add(id);
  }

  hasDone(id: string): boolean {
    return this.done.has(id);
  }

  canRun(ev: EventDef): boolean {
    if (this.running) return false;
    if (ev.once && this.done.has(ev.id)) return false;
    return (ev.requires ?? []).every((r) => this.done.has(r));
  }

  async runEvent(ev: EventDef): Promise<void> {
    if (!this.canRun(ev)) return;
    this.running = true;
    this.done.add(ev.id);
    try {
      await this.run(ev.actions);
    } finally {
      this.running = false;
    }
  }

  private async run(actions: Action[]): Promise<void> {
    for (const a of actions) {
      if (this.host.aborted) return;
      await this.exec(a);
    }
  }

  private async exec(a: Action): Promise<void> {
    switch (a.type) {
      case "setFlag":
        this.flags.add(a.flag);
        return;
      case "branch":
        return this.run(this.flags.has(a.flag) ? a.then : (a.else ?? []));
      case "choice": {
        const i = await this.host.choose(a.options.map((o) => o.label));
        return this.run(a.options[i].then);
      }
      default:
        return this.host.perform(a);
    }
  }
}
