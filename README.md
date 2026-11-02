# L'aventure de Sacha / Léa

JRPG pixel art jouable dans le navigateur (Phaser 3 + TypeScript), avec sauvegardes côté serveur.

**Avancement : étapes 1 et 2 sur 6** (architecture, menus, sauvegarde serveur). Déplacements, dialogues, combats et niveau 1 : étapes suivantes.

## Lancer le jeu

```bash
docker compose up -d --build
```

Puis ouvrir http://localhost:8080 (PC ou téléphone sur le même réseau : `http://<ip-de-l-hôte>:8080`).

## Sauvegardes

- Un fichier JSON par sauvegarde dans `./data/saves/` (monté sur `/app/data/saves` dans le conteneur).
- Elles survivent au redémarrage, à la mise à jour et à la reconstruction de l'image.
- Maximum 6 emplacements.
- Le navigateur ne peut pas écrire une progression. Le serveur délivre un jeton au démarrage d'un niveau (`/start`), et seule la route `/complete` modifie la sauvegarde : jeton valide, niveau débloqué, durée minimale respectée.
- Les jetons sont gardés en mémoire : un redémarrage du serveur en plein niveau oblige à relancer le niveau.

### API

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/saves` | Lister les sauvegardes |
| POST | `/api/saves` `{ "character": "Sacha" \| "Léa" }` | Créer une sauvegarde |
| GET | `/api/saves/:id` | Charger une sauvegarde |
| POST | `/api/saves/:id/levels/:levelId/start` | Démarrer un niveau (renvoie un jeton) |
| POST | `/api/saves/:id/levels/:levelId/complete` `{ "token" }` | Valider un niveau, débloquer le suivant, sauvegarder |

### Tester la persistance

```bash
docker compose up -d --build
DISABLE_LEVEL_TIMER=1 npm run test:api   # serveur local, ou voir ci-dessous
docker compose restart game
curl localhost:8080/api/saves            # la sauvegarde est toujours là
```

`npm run test:api` attend un serveur lancé avec `DISABLE_LEVEL_TIMER=1` (désactive la durée minimale, à ne jamais activer en production).

## Développement

```bash
npm install
npm run dev:server   # API sur :8080 (sauvegardes dans ./data/saves)
npm run dev          # frontend Vite avec proxy /api, http://localhost:5173
npm run typecheck
```

En mode dev, le niveau contient un bouton « [dev] Valider le niveau » pour tester la validation serveur.

## Ajouter un niveau

1. Ajouter une entrée dans `shared/levels.ts` (id, nom, durée minimale).
2. Créer `src/levels/LevelXX/LevelXX.ts` exportant une `LevelDefinition` (id + clé de scène).
3. L'enregistrer dans `src/levels/levelRegistry.ts`.

Le serveur débloque automatiquement le niveau suivant de la liste à la validation du précédent. Un niveau listé mais non enregistré s'affiche « Bientôt ».

## Structure

```
shared/   types et liste des niveaux (client + serveur)
server/   API Fastify, stockage JSON atomique
src/core  config Phaser, client d'API, état de session
src/scenes, src/ui, src/art, src/levels
```
