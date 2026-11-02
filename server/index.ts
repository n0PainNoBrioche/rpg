import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 8080);
const app = await buildApp({
  savesDir: process.env.SAVES_DIR ?? "/app/data/saves",
  staticDir: process.env.STATIC_DIR ?? "dist",
  disableLevelTimer: process.env.DISABLE_LEVEL_TIMER === "1",
});

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => void app.close().then(() => process.exit(0)));
}
