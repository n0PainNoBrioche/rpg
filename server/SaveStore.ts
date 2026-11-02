import { promises as fs } from "node:fs";
import path from "node:path";
import type { SaveData } from "../shared/types.js";

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSaveData(v: unknown): v is SaveData {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.pseudo === "string" &&
    (s.character === "Sacha" || s.character === "Léa") &&
    Array.isArray(s.completedLevels) &&
    Array.isArray(s.unlockedLevels)
  );
}

/** Stockage des sauvegardes : un fichier JSON par sauvegarde, écriture atomique. */
export class SaveStore {
  private locks = new Map<string, Promise<unknown>>();

  constructor(private readonly dir: string) {}

  async init(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  static isValidId(id: string): boolean {
    return ID_RE.test(id);
  }

  private file(id: string): string {
    if (!SaveStore.isValidId(id)) throw new Error("Identifiant de sauvegarde invalide");
    return path.join(this.dir, `${id}.json`);
  }

  async list(): Promise<SaveData[]> {
    const names = await fs.readdir(this.dir);
    const saves: SaveData[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      try {
        const parsed: unknown = JSON.parse(await fs.readFile(path.join(this.dir, name), "utf8"));
        if (isSaveData(parsed)) saves.push(parsed);
        else console.warn(`[saves] fichier ignoré (format invalide) : ${name}`);
      } catch (err) {
        console.warn(`[saves] fichier illisible ignoré : ${name}`, err);
      }
    }
    return saves.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<SaveData | null> {
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(this.file(id), "utf8"));
      return isSaveData(parsed) ? parsed : null;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  /** Écriture atomique : fichier temporaire puis renommage. */
  async write(save: SaveData): Promise<void> {
    const target = this.file(save.id);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(save, null, 2), "utf8");
    await fs.rename(tmp, target);
  }

  /** Sérialise les modifications d'une même sauvegarde. */
  async withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(id) ?? Promise.resolve();
    const run = prev.then(fn, fn);
    const settled = run.catch(() => undefined);
    this.locks.set(id, settled);
    try {
      return await run;
    } finally {
      if (this.locks.get(id) === settled) this.locks.delete(id);
    }
  }
}
