# Mise en place

Ce que Hugo fait à la main. Le reste est fait par Claude Code.

## Avant le jalon 1

1. Créer un dépôt GitHub public, par exemple `dscg-cartes`, et y déposer le contenu de ce kit.
2. Ouvrir le dossier dans VS Code et lancer Claude Code.
3. Premier message : « Lis `CLAUDE.md` et `docs/SPEC.md`, puis propose-moi le plan du jalon 1. »
4. Dans les réglages du dépôt, activer GitHub Pages avec la source « GitHub Actions ».

## Avant le jalon 4 (synchronisation)

1. Créer un compte et un projet Supabase gratuit, de préférence dans une région européenne.
2. Exécuter `supabase/schema.sql` dans l'éditeur SQL du projet.
3. Créer son compte utilisateur (e-mail et mot de passe), puis désactiver les nouvelles inscriptions.
4. Copier l'URL du projet et la clé publique `anon` dans les variables du dépôt GitHub : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
5. Ne jamais copier la clé `service_role` dans le dépôt ni dans ses variables.

## Sur l'iPhone

1. Ouvrir l'adresse GitHub Pages de l'app dans Safari.
2. Partager, puis « Sur l'écran d'accueil ».
3. Ouvrir l'app depuis l'icône, se connecter une fois.

## Sauvegardes

L'offre gratuite de Supabase n'a pas de sauvegarde automatique. Utiliser de temps en temps « Exporter ma progression » dans les réglages de l'app, et ranger le fichier sur Drive.

## Ajouter les cartes d'un nouveau chapitre

Demander à Claude (dans le projet DSCG de claude.ai) le fichier JSON du chapitre, le déposer dans `cards/`, puis pousser sur `main`.
