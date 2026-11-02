// Test de l'API de sauvegarde. Le serveur doit tourner avec DISABLE_LEVEL_TIMER=1.
// Usage : BASE_URL=http://localhost:8080 node scripts/api-smoke-test.mjs
const BASE = process.env.BASE_URL ?? "http://localhost:8080";
let failed = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
function check(name, cond, extra = "") {
  console.log(`${cond ? "OK  " : "FAIL"} ${name}${cond ? "" : " " + extra}`);
  if (!cond) failed++;
}

const created = await call("POST", "/api/saves", { character: "Léa" });
check("création (201)", created.status === 201 && created.json.pseudo === "Léa");
const id = created.json.id;
check("niveau 1 débloqué seul", JSON.stringify(created.json.unlockedLevels) === '["level01"]');

check("personnage invalide refusé", (await call("POST", "/api/saves", { character: "Bob" })).status === 400);
check("id invalide refusé", (await call("GET", "/api/saves/../../etc/passwd")).status !== 200);
check("id mal formé (400)", (await call("GET", "/api/saves/abc")).status === 400);

const list = await call("GET", "/api/saves");
check("liste contient la sauvegarde", list.json.some((s) => s.id === id));

check("niveau 2 verrouillé au départ", (await call("POST", `/api/saves/${id}/levels/level02/start`)).status === 403);
check("validation sans session refusée", (await call("POST", `/api/saves/${id}/levels/level01/complete`, { token: "x" })).status === 403);

const start = await call("POST", `/api/saves/${id}/levels/level01/start`);
check("démarrage niveau 1", start.status === 200 && typeof start.json.token === "string");
check("mauvais jeton refusé", (await call("POST", `/api/saves/${id}/levels/level01/complete`, { token: "faux" })).status === 403);

const done = await call("POST", `/api/saves/${id}/levels/level01/complete`, { token: start.json.token });
check("validation niveau 1", done.status === 200 && done.json.completedLevels.includes("level01"));
check("niveau 2 débloqué", done.json.unlockedLevels.includes("level02"));

const reload = await call("GET", `/api/saves/${id}`);
check("progression persistée", reload.json.lastCompletedLevel === "level01");
console.log(`SAVE_ID=${id}`);
process.exit(failed ? 1 : 0);
