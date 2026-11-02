import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import { SaveStore } from "./SaveStore.js";
import { FIRST_LEVEL_ID, getLevelMeta, getNextLevelId } from "../shared/levels.js";
import {
  CHARACTER_NAMES,
  MAX_SAVES,
  type ApiErrorBody,
  type CharacterName,
  type LevelStartResponse,
  type SaveData,
  type SaveSummary,
} from "../shared/types.js";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface AppOptions {
  savesDir: string;
  staticDir?: string;
  /** Désactive la durée minimale d'un niveau (tests uniquement). */
  disableLevelTimer?: boolean;
}

interface LevelSession {
  token: string;
  startedAt: number;
}

function toSummary(s: SaveData): SaveSummary {
  return {
    id: s.id,
    pseudo: s.pseudo,
    character: s.character,
    lastCompletedLevel: s.lastCompletedLevel,
    completedCount: s.completedLevels.length,
    updatedAt: s.updatedAt,
  };
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: true, bodyLimit: 1024 });
  const store = new SaveStore(opts.savesDir);
  await store.init();

  /** Sessions de niveau en cours : clé "saveId:levelId". Perdues au redémarrage du serveur. */
  const sessions = new Map<string, LevelSession>();

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof HttpError) {
      return reply.status(err.status).send({ error: err.code, message: err.message } satisfies ApiErrorBody);
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500) {
      return reply.status(status).send({ error: "bad_request", message: "Requête invalide." } satisfies ApiErrorBody);
    }
    app.log.error(err);
    return reply.status(500).send({ error: "internal", message: "Erreur interne du serveur." } satisfies ApiErrorBody);
  });

  const loadSave = async (id: string): Promise<SaveData> => {
    if (!SaveStore.isValidId(id)) throw new HttpError(400, "invalid_id", "Identifiant de sauvegarde invalide.");
    const save = await store.get(id);
    if (!save) throw new HttpError(404, "not_found", "Sauvegarde introuvable.");
    return save;
  };

  app.get("/api/health", async () => ({ status: "ok" }));

  app.get("/api/saves", async () => (await store.list()).map(toSummary));

  app.post("/api/saves", async (req, reply) => {
    const body = (req.body ?? {}) as { character?: unknown };
    if (!CHARACTER_NAMES.includes(body.character as CharacterName)) {
      throw new HttpError(400, "invalid_character", "Le personnage doit être Sacha ou Léa.");
    }
    const character = body.character as CharacterName;
    if ((await store.list()).length >= MAX_SAVES) {
      throw new HttpError(409, "slots_full", `Les ${MAX_SAVES} emplacements de sauvegarde sont pleins.`);
    }
    const now = new Date().toISOString();
    const save: SaveData = {
      id: randomUUID(),
      pseudo: character,
      character,
      createdAt: now,
      updatedAt: now,
      completedLevels: [],
      unlockedLevels: [FIRST_LEVEL_ID],
      lastCompletedLevel: null,
    };
    await store.write(save);
    return reply.status(201).send(save);
  });

  app.get<{ Params: { id: string } }>("/api/saves/:id", async (req) => loadSave(req.params.id));

  /** Démarre un niveau : le serveur délivre un jeton nécessaire à la validation. */
  app.post<{ Params: { id: string; levelId: string } }>("/api/saves/:id/levels/:levelId/start", async (req) => {
    const { id, levelId } = req.params;
    const save = await loadSave(id);
    if (!getLevelMeta(levelId)) throw new HttpError(404, "unknown_level", "Niveau inconnu.");
    if (!save.unlockedLevels.includes(levelId)) throw new HttpError(403, "level_locked", "Niveau verrouillé.");
    const session: LevelSession = { token: randomBytes(16).toString("hex"), startedAt: Date.now() };
    sessions.set(`${id}:${levelId}`, session);
    return { token: session.token } satisfies LevelStartResponse;
  });

  /** Valide un niveau : seule route qui modifie la progression (et déclenche la sauvegarde). */
  app.post<{ Params: { id: string; levelId: string }; Body: { token?: unknown } }>(
    "/api/saves/:id/levels/:levelId/complete",
    async (req) => {
      const { id, levelId } = req.params;
      const meta = getLevelMeta(levelId);
      if (!meta) throw new HttpError(404, "unknown_level", "Niveau inconnu.");

      return store.withLock(id, async () => {
        const save = await loadSave(id);
        if (!save.unlockedLevels.includes(levelId)) throw new HttpError(403, "level_locked", "Niveau verrouillé.");
        if (save.completedLevels.includes(levelId)) return save; // idempotent

        const key = `${id}:${levelId}`;
        const session = sessions.get(key);
        const token = typeof req.body?.token === "string" ? req.body.token : "";
        if (!session || !safeEqual(session.token, token)) {
          throw new HttpError(403, "invalid_session", "Aucune session de niveau valide : relance le niveau.");
        }
        if (!opts.disableLevelTimer && Date.now() - session.startedAt < meta.minDurationSec * 1000) {
          throw new HttpError(403, "too_fast", "Validation refusée : niveau terminé trop vite.");
        }

        sessions.delete(key);
        const next = getNextLevelId(levelId);
        const updated: SaveData = {
          ...save,
          completedLevels: [...save.completedLevels, levelId],
          unlockedLevels: next && !save.unlockedLevels.includes(next) ? [...save.unlockedLevels, next] : save.unlockedLevels,
          lastCompletedLevel: levelId,
          updatedAt: new Date().toISOString(),
        };
        await store.write(updated);
        return updated;
      });
    },
  );

  const staticDir = opts.staticDir;
  if (staticDir && existsSync(path.join(staticDir, "index.html"))) {
    await app.register(fastifyStatic, { root: path.resolve(staticDir) });
  } else {
    app.log.warn("Dossier du frontend introuvable : seule l'API est servie.");
  }

  return app;
}
