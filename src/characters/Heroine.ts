import { createPartyMember } from "./Character";

/** Sacha ou Léa : même personnage, seul le prénom change. */
export const createHeroine = (name: string) => createPartyMember("heroine", name);
