# DSCG Cartes

Web app personnelle de révision par répétition espacée, pour préparer le DSCG. Elle remplace AnkiWeb, jugé ni beau ni fluide. Le cahier des charges complet est dans `docs/SPEC.md` : lis-le avant toute tâche.

## Contexte

- **Utilisateur unique : Hugo**, 30 ans, en reconversion vers l'expertise comptable. Ancien consultant data et IA : il lit le code, mais il veut avancer vite et garder un outil simple.
- **Examen :** DSCG, session d'octobre 2027. UE 1 (droit et fiscalité, épreuve sans Code) et UE 4 (comptabilité et audit).
- **Rythme :** environ 15 à 20 minutes de révision par jour, souvent sur iPhone dans les transports, parfois sur Mac.
- **Les cartes** sont rédigées et vérifiées avec Claude, dans un autre outil, puis déposées dans `cards/` sous forme de fichiers JSON. Un fichier par chapitre. Le premier fichier, `cards/ue1-ch01-contrats.json`, contient 218 cartes.

## Pourquoi l'app existe

Elle repose sur deux techniques d'apprentissage validées : le **test de mémoire** (chercher la réponse avant de la voir) et la **répétition espacée** (revoir une notion juste avant de l'oublier). Chaque choix d'interface doit servir ces deux techniques :

- La réponse reste cachée tant que Hugo ne l'a pas demandée.
- L'auto-évaluation est rapide : trois boutons, à portée de pouce.
- Une session doit démarrer en un geste et ne jamais attendre le réseau.
- Rien ne doit distraire pendant une session : pas d'animation lente, pas de navigation visible.

## Choix techniques

Vite, React, TypeScript strict, CSS simple avec les variables de `docs/design-tokens.css`, Dexie (IndexedDB), `ts-fsrs` (FSRS, rétention 0,90), Supabase pour la synchronisation iPhone et Mac, `vite-plugin-pwa`, React Router en mode hash, Vitest. Déploiement par GitHub Actions sur GitHub Pages, dépôt public.

N'ajoute pas de dépendance sans demander.

## Façon de travailler

- Avance **jalon par jalon** (section 10 de `docs/SPEC.md`). Ne commence pas un jalon avant que le précédent soit déployé et validé par Hugo.
- En début de jalon, propose un plan court et attends son accord.
- En fin de jalon, donne la liste de ce qu'il doit vérifier à la main, sur iPhone et sur Mac.
- Si le cahier des charges est flou ou contradictoire, demande plutôt que de deviner.
- Réponds en français.

## Règles à ne jamais enfreindre

- **Identifiants de cartes :** ne jamais modifier, renuméroter ni réutiliser un `id` dans `cards/*.json`. La progression y est rattachée.
- **Contenu des cartes :** ne jamais réécrire une question ou une réponse. Le contenu juridique est vérifié ailleurs. Signale une erreur plutôt que de la corriger.
- **Journal des révisions :** c'est la source de vérité, en ajout seul. Pas de suppression : une annulation passe par `annulee = true`.
- **Secrets :** le dépôt est public. Jamais de clé `service_role`, de mot de passe ni de fichier `.env` commité. Côté client, seules l'URL et la clé `anon` de Supabase sont utilisées.
- **Planification :** la logique FSRS et la composition des sessions restent dans un module pur, sans accès au stockage ni à l'horloge, et couvert par des tests. Toute modification s'accompagne de tests.
- **Hors-ligne d'abord :** aucune fonction de révision ne doit dépendre du réseau.

## Conventions

- Code, noms de fichiers et commits en anglais. Textes de l'interface en français, avec tutoiement.
- Interface pensée d'abord pour l'iPhone : une colonne, zones tactiles d'au moins 44 px, zones sûres respectées.
- Couleurs uniquement par les variables de `docs/design-tokens.css`, en clair et en sombre. Chaque thème de cartes a sa couleur, la même que dans les fiches de révision.
- Composants petits, logique métier hors des composants.
- Commits courts et fréquents, un sujet par commit.

## Commandes

- `npm run dev` : serveur de développement (http://localhost:5173/dscg-cartes/).
- `npm test` : tests Vitest (`npm run test:watch` en continu).
- `npm run build` : validation des cartes, vérification TypeScript, build dans `dist/`.
- `npm run validate:cards` : valide `cards/*.json` (Node 22.18 ou plus, qui exécute le TypeScript directement).
- `npm run preview` : sert le build local.
- `node scripts/icon/render.mjs` : régénère les icônes de `public/` depuis `scripts/icon/icon.html` (nécessite Google Chrome).
- `npm run lock:refresh` : régénère `package-lock.json`. À lancer après tout ajout ou mise à jour de dépendance : sur Mac, npm oublie des dépendances optionnelles Linux et `npm ci` échoue dans GitHub Actions.

Organisation : `src/cards/` (types, validation, catalogue), `src/scheduler/` (FSRS, rejeu du journal, composition des sessions : modules purs et testés), `src/data/` (IndexedDB via Dexie, contexte React, pilotage de session, sauvegarde), `src/components/`, `src/screens/`, `scripts/validate-cards.ts`. Le déploiement est dans `.github/workflows/deploy.yml`.

## Ajouter un chapitre

Déposer le fichier JSON dans `cards/`, lancer la validation, puis pousser sur `main`. Aucun changement de code ne doit être nécessaire.
