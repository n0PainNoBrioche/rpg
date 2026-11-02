import type { ApiErrorBody, CharacterName, LevelStartResponse, SaveData, SaveSummary } from "../../shared/types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network", "Serveur de sauvegarde injoignable.");
  }
  if (!res.ok) {
    let err: Partial<ApiErrorBody> = {};
    try {
      err = await res.json();
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(res.status, err.error ?? "http", err.message ?? `Erreur serveur (${res.status}).`);
  }
  return (await res.json()) as T;
}

/** Client de l'API de sauvegarde. Le serveur décide de toute la progression. */
export const SaveManager = {
  list: () => request<SaveSummary[]>("GET", "/api/saves"),
  create: (character: CharacterName) => request<SaveData>("POST", "/api/saves", { character }),
  load: (id: string) => request<SaveData>("GET", `/api/saves/${id}`),
  startLevel: (id: string, levelId: string) =>
    request<LevelStartResponse>("POST", `/api/saves/${id}/levels/${levelId}/start`),
  completeLevel: (id: string, levelId: string, token: string) =>
    request<SaveData>("POST", `/api/saves/${id}/levels/${levelId}/complete`, { token }),
};
