# Pipeline cours → fiche → cartes

Sur le Mac de l'utilisateur : quand un cours (PDF) arrive dans `Mon Drive > DSCG > UE 1 - droit`, la fiche et les cartes se font seules.

1. `.build/dscg-watch` (agent `launchd`, priorité arrière-plan) surveille le dossier avec FSEvents. Après un dépôt et 30 s de calme, il lance `bin/process.sh`. Il le lance aussi au démarrage et toutes les 6 h.
2. `bin/process.sh` cherche les dossiers `Chap N…` qui contiennent un PDF mais pas de `Fiche - Chapitre N - ….pdf`, ainsi que les PDF déposés directement dans le dossier de l'UE (il crée alors `Chap N - <Titre>` et y range le cours).
3. Il extrait le texte de tous les PDF du chapitre (cours et documents du professeur), puis lance Claude Code sans interface avec `PROMPT.md` et `CONVENTIONS.md` (le kit de fiches, adapté). Claude écrit `fiche.html`, `cartes.json` et `meta.json`.
4. Les cartes passent `tools/check-cards.mjs` (règles de l'app, identifiants globaux). En cas d'erreur, Claude a un tour de correction.
4 bis. **Seconde passe de vérification** (`VERIFY_PROMPT.md`) : une autre exécution de Claude contrôle chaque règle, délai, sanction, arrêt et numéro d'article en vigueur (Légifrance via WebSearch, la lecture directe étant bloquée), corrige la fiche et les cartes avant publication, et écrit `verification.md` dans le dossier de travail.
5. `tools/fiche-pdf.cjs` tire le PDF A4 (Chrome installé), rangé à côté du cours. Les cartes vont dans `cards/`, sont validées, commitées seules et poussées : l'app se met à jour.
6. Une notification macOS annonce le résultat.

**Documents arrivés plus tard** (fiches d'arrêts, définitions, exercices du professeur) : quand un dossier qui a déjà sa fiche reçoit un nouveau PDF, le pipeline relance Claude avec `UPDATE_PROMPT.md`. La fiche est complétée et remplacée sous le même nom (Google Drive garde l'ancienne dans l'historique des versions), avec un bloc « Mise à jour du … » à la fin de la synthèse. Les nouvelles cartes s'ajoutent à la suite ; les cartes existantes ne changent jamais (`check-cards.mjs --extends` le vérifie), un désaccord est seulement signalé dans la fiche. L'état de chaque chapitre (documents utilisés, source HTML de la fiche) est gardé dans `chapters/`.

Garde-fous : un seul traitement à la fois ; un chapitre dont les cartes existent déjà n'est jamais régénéré (identifiants définitifs) ; un échec n'est pas retenté tant que les PDF du chapitre ne changent pas ; Claude n'a accès qu'à son dossier de travail, au web et au contrôle des cartes.

## Commandes

- Installer ou mettre à jour : `pipeline/bin/install.sh`
- Lancer à la main, sans attendre : `DSCG_SETTLE=0 pipeline/bin/process.sh`
- Tester sans toucher au vrai Drive : variables `DSCG_DRIVE`, `DSCG_STATE`, `DSCG_CLAUDE` (un faux Claude) et `DSCG_NO_PUSH=1` (voir l'en-tête de `process.sh`)
- Modifier `process.sh` pendant un traitement : écrire un nouveau fichier puis le renommer (`mv`), jamais l'éditer sur place
- Journaux et dossiers de travail : `~/Library/Application Support/dscg-pipeline/` (`logs/`, `work/`)
- Retraiter un chapitre en échec : supprimer `failed/<clé>` dans ce dossier.
- Désinstaller : `launchctl bootout gui/$(id -u)/com.dscg.pipeline`, puis supprimer `~/Library/LaunchAgents/com.dscg.pipeline.plist`.

Le cours et la fiche ne sont jamais copiés dans le dépôt : seules les cartes y entrent.
