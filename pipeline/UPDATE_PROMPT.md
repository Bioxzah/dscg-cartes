Tu travailles seul, sans interlocuteur : ne pose aucune question.

La fiche et les cartes du chapitre {NUM} de l'{UE} existent déjà. De nouveaux documents ont été ajoutés au dossier du chapitre : {NEW}. Mets la fiche et les cartes à jour avec ce qu'ils apportent.

1. Lis `CONVENTIONS.md` en entier, puis `fiche-actuelle.html` (la fiche en place) et `cartes-actuelles.json` (les cartes en place, que Hugo révise déjà).
2. Lis les nouveaux documents dans `entrees/` : {NEW}. Les autres fichiers de `entrees/` sont ceux déjà utilisés : {OLD}. Les documents du professeur servent à vérifier et compléter ; ne reprends jamais l'énoncé d'un exercice.
3. Vérifie le droit sur des sources fiables (Légifrance d'abord) pour tout ce que tu ajoutes.
4. **Fiche** : écris `fiche.html`, la fiche complète mise à jour, sur la même structure et le même style. Complète les sections concernées (par exemple les arrêts à connaître). Garde la section finale « Ce qui change par rapport au cours » et ajoute-lui à la fin un bloc « Mise à jour du {DATE} » : ce que les nouveaux documents ont apporté (une ligne par point), et tout désaccord entre ces documents et la fiche ou les cartes en place.
5. **Cartes** : écris `cartes.json` = `cartes-actuelles.json` à l'identique (mêmes thèmes, mêmes cartes, même ordre, aucun caractère changé), puis tes nouvelles cartes à la suite, numérotées à partir de `{NEXT}`. Un nouveau thème éventuel va à la fin de `deck.themes`. Ne modifie jamais une carte existante, même fausse : signale-la dans le bloc « Mise à jour » avec son identifiant et la correction proposée.
6. Contrôle avec `{CHECK} cartes.json {DECK} --extends cartes-actuelles.json` et corrige jusqu'à ce qu'il n'y ait plus d'erreur.
7. Écris `meta.json` comme pour une première fiche (`cartes` = nombre total de cartes), et rien en dehors du dossier courant.

Termine par une ligne « TERMINÉ » suivie d'un résumé de trois lignes.
