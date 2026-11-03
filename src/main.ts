import "@fontsource/press-start-2p/index.css";
import { createGame } from "./core/Game";

const game = createGame("game");
// Mode débogage (?debug) : expose le jeu pour les tests automatisés.
if (new URLSearchParams(location.search).has("debug")) (window as unknown as { __game: unknown }).__game = game;
