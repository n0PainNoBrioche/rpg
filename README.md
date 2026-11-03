# L'aventure de Sacha / Léa

JRPG pixel art humoristique jouable dans le navigateur (PC et mobile), Phaser 3 + TypeScript, avec sauvegardes côté serveur.

**Niveau 1 : « La taxe rose »** : Macron le petit con (politicien fictif) veut taxer à 1000 % les protections hygiéniques. Sacha (ou Léa) rencontre Clément, affronte le boss, puis doit répondre à une invitation : accepter valide le niveau et sauvegarde, refuser mène à un Game Over sans sauvegarde.

## Lancer le jeu

```bash
docker compose up -d --build
```

Puis ouvrir http://localhost:8080 (téléphone sur le même réseau : `http://<ip-de-l-hôte>:8080`).

## Commandes

| | PC | Mobile |
|---|---|---|
| Se déplacer | flèches, A/D ou Q | boutons < > |
| Interagir / valider | Espace, Entrée ou Z | bouton A / toucher |
| Menus de combat | flèches + Entrée, Échap pour revenir | toucher |
| Volume | touche M ou bouton en haut à droite | bouton en haut à droite |

Le jeu se joue en mode paysage (un message invite à pivoter le téléphone).

## Sauvegardes

- Un fichier JSON par sauvegarde dans `./data/saves/` (monté sur `/app/data/saves`), 6 emplacements maximum.
- Une sauvegarde n'est écrite qu'à la validation complète d'un niveau (le prénom choisi crée l'emplacement, la progression ne change qu'à la fin d'un niveau).
- Le navigateur ne peut pas modifier la progression : `/start` délivre un jeton, `/complete` vérifie le jeton, le déblocage du niveau et une durée minimale (40 s pour le niveau 1).
- Les jetons sont gardés en mémoire : relancer le serveur en plein niveau oblige à relancer le niveau.

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/saves` | Lister les sauvegardes |
| POST | `/api/saves` `{ "character": "Sacha" \| "Léa" }` | Créer une sauvegarde |
| GET | `/api/saves/:id` | Charger une sauvegarde |
| POST | `/api/saves/:id/levels/:levelId/start` | Démarrer un niveau (renvoie un jeton) |
| POST | `/api/saves/:id/levels/:levelId/complete` `{ "token" }` | Valider le niveau et sauvegarder |

## Développement et tests

```bash
npm install
npm run dev:server   # API sur :8080 (durée minimale désactivée, sauvegardes dans ./data/saves)
npm run dev          # frontend Vite sur http://localhost:5173 (proxy /api)
npm run typecheck
npx tsx scripts/validate-and-simulate.ts   # cohérence des données + simulation de 400 combats
npm run test:api                           # API de sauvegarde (serveur lancé avec DISABLE_LEVEL_TIMER=1)
```

`DISABLE_LEVEL_TIMER=1` ne doit jamais être activé en production. Paramètres d'URL de test : `?startX=1170` (démarre le niveau près du boss), `?touch` (force les boutons tactiles), `?debug` (expose `window.__game`).

## Contenu modifiable sans toucher au moteur

- `src/levels/Level01/dialogues.json`, `events.json`, `enemies.json` : dialogues, déroulé du niveau, boss et ses attaques.
- `src/characters/characters.json` : statistiques et compétences de l'héroïne et de Clément.
- `src/combat/data/skills.json` et `items.json` : compétences (dégâts, coût en PM, altérations, textes) et objets.
- `src/assets/music/tracks.json` et `src/assets/audio/sfx.json` : musiques et effets, synthétisés (WebAudio). Pour utiliser de vrais fichiers audio, les déposer dans `public/audio/` et les déclarer dans `public/audio/manifest.json`.
- Les sprites et décors sont dessinés en code (`src/art/`) et peuvent être remplacés par de vraies images.

## Ajouter un niveau

1. Ajouter une entrée dans `shared/levels.ts` (id, nom, durée minimale).
2. Créer `src/levels/LevelXX/` (définition, dialogues, événements, ennemis) en copiant `Level01`.
3. L'enregistrer dans `src/levels/levelRegistry.ts`.

Le serveur débloque le niveau suivant à la validation du précédent. Un niveau listé mais non enregistré s'affiche « Bientôt ».

## Structure

```
shared/        types et liste des niveaux (client + serveur)
server/        API Fastify, stockage JSON atomique
src/core       config Phaser, client d'API, moteur d'événements
src/scenes     menus, exploration, combat, game over, fin de niveau
src/combat     règles du combat (sans Phaser), effets visuels, données
src/ui, art, audio, characters, levels
scripts/       tests et simulation
```
