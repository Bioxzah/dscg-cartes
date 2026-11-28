Tu travailles seul, sans interlocuteur : ne pose aucune question.

La fiche et les cartes du chapitre {NUM} de l'{UE} existent déjà. De nouveaux documents ont été ajoutés au dossier du chapitre : {NEW}. Mets la fiche et les cartes à jour avec ce qu'ils apportent.

1. Lis `CONVENTIONS.md` en entier, puis `fiche-actuelle.html` (la fiche en place) et `cartes-actuelles.json` (les cartes en place, que l'utilisateur révise déjà).
2. **Analyse l'existant avant d'écrire une seule carte.** `existant/` contient tous les paquets de l'app (les autres chapitres aussi : une notion peut déjà y être), `existant/archive/` les cartes que l'utilisateur a retirées exprès. Une notion couverte là, même sous une autre formulation, n'a pas de nouvelle carte, et une carte archivée ne revient pas.
3. **Arrête une stratégie de cartes resserrée** avant de rédiger : liste ce que les nouveaux documents apportent de vraiment nouveau et d'utile pour résoudre un cas d'examen, et fixe un budget (repère : 10 cartes au plus pour une mise à jour, moins si les documents apportent peu). Un arrêt dont la règle a déjà sa carte n'a pas de carte propre : cite-le dans la fiche. Préfère un vrai cas pratique à plusieurs cartes de règle quand une notion s'y prête.
4. Lis les nouveaux documents dans `entrees/` : {NEW}. Les autres fichiers de `entrees/` sont ceux déjà utilisés : {OLD}. Les documents du professeur servent à vérifier et compléter ; ne reprends jamais l'énoncé d'un exercice.
5. Vérifie le droit sur des sources fiables (Légifrance d'abord) pour tout ce que tu ajoutes.
6. **Fiche** : écris `fiche.html`, la fiche complète mise à jour, sur la même structure et le même style. Intègre les apports directement dans les sections concernées (par exemple les arrêts à connaître). **N'ajoute aucun bloc de mise à jour à la fiche.** Si un nouveau document du professeur contient une erreur utile à connaître pour l'examen, ajoute une ligne au tableau « Corrigé par rapport au cours », et rien d'autre. Écris dans `rapport.md` : ce que les nouveaux documents ont apporté (une ligne par point), ta stratégie de cartes (combien, lesquelles, ce qui est laissé sans carte parce que déjà couvert), les désaccords et les points incertains.
7. **Cartes** : écris `cartes.json` = `cartes-actuelles.json` à l'identique (mêmes thèmes, mêmes cartes, même ordre, aucun caractère changé), puis tes nouvelles cartes à la suite, numérotées à partir de `{NEXT}`. Un nouveau thème éventuel va à la fin de `deck.themes`. Ne modifie jamais une carte existante, même fausse : signale-la dans `rapport.md` avec son identifiant et la correction proposée.
8. Contrôle avec `{CHECK} cartes.json {DECK} --extends cartes-actuelles.json` et corrige jusqu'à ce qu'il n'y ait plus d'erreur.
9. Écris `meta.json` comme pour une première fiche (`cartes` = nombre total de cartes), et rien en dehors du dossier courant.

Termine par une ligne « TERMINÉ » suivie d'un résumé de trois lignes.
