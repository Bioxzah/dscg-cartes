Tu travailles seul, sans interlocuteur : ne pose aucune question.

1. Lis `CONVENTIONS.md` en entier, puis `modele/fiche-modele-ue1-ch01.html` (le modèle à reproduire : garde son HTML, son CSS et son script, change le contenu) et `modele/cartes-modele.json`.
2. Prépare la fiche et les cartes du chapitre {NUM} de l'{UE} à partir des textes de `entrees/` : {FILES}.
   **Avant de rédiger les cartes, analyse l'existant** : `existant/` contient tous les paquets déjà dans l'app (une notion d'un autre chapitre n'a pas de seconde carte) et `existant/archive/` les cartes que l'utilisateur a retirées exprès (elles ne reviennent pas). Arrête ensuite une stratégie resserrée, dans les volumes de `CONVENTIONS.md`, et résume-la dans la synthèse de fin de fiche (bloc « Ajouté »).
   - Le cours principal est `{MAIN}`.
   - Les autres fichiers sont des documents du professeur (définitions, jurisprudence, exercices). Sers-t'en pour vérifier et compléter, mais ne reprends jamais l'énoncé d'un exercice.
3. Vérifie le droit sur des sources fiables (Légifrance d'abord) : le cours peut contenir des erreurs.
4. Identifiants : paquet `{DECK}`, cartes `{DECK}-001`, `-002`, etc. Paquets déjà dans l'app (à ne pas réutiliser) : {KNOWN}.
5. Contrôle les cartes avec `{CHECK} cartes.json {DECK}` et corrige jusqu'à ce qu'il n'y ait plus d'erreur.
6. Écris `fiche.html`, `cartes.json` et `meta.json` dans le dossier courant, et rien ailleurs.
7. La dernière section de la fiche, avant le pied de page, est « Ce qui change par rapport au cours ».

Termine par une ligne « TERMINÉ » suivie d'un résumé de trois lignes.
