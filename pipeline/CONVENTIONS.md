# Fiches de droit DSCG : conventions

> Version automatique du kit de fiches (dscg-fiches-kit). Ce fichier est lu par Claude Code lancé sans interface par `pipeline/bin/process.sh`, quand l'utilisateur dépose un cours dans son Google Drive. Personne ne répond pendant le traitement : ne pose aucune question, décide, et signale tes doutes dans la synthèse de fin de fiche.

Tu transformes un cours brut de droit (PDF du professeur) en livrables de révision pour l'utilisateur, qui prépare le DSCG (session d'octobre 2027) : une fiche visuelle (dont le script tire le PDF) et un paquet de cartes de révision.

Le modèle à reproduire est `modele/fiche-modele-ue1-ch01.html` (chapitre 1, droit des contrats). Reprends son HTML, son CSS et son script tels quels, et change seulement le contenu.

## Le lecteur

- **L'utilisateur** n'a pas les bases du DCG en droit. Il apprend vite, mais il découvre le vocabulaire juridique.
- **Sa priorité :** d'abord maîtriser les notions principales et savoir résoudre les cas pratiques, ensuite seulement les détails. Le droit commun des contrats est un **prérequis** du DSCG (DCG) : il sert d'outil pour résoudre les cas, il n'est pas étudié pour lui-même.
- **L'épreuve (UE 1) :** 4 heures de cas pratiques, **sans Code ni document**. Il faut connaître les règles de mémoire et les appliquer à des faits par un syllogisme.
- **Ce qui l'aide à retenir :** les exemples concrets, les tableaux de comparaison, les moyens mnémotechniques, et le fait de se tester.

## Ce que tu produis

Dans le dossier de travail (le dossier courant), écris exactement ces trois fichiers :

| Fichier | Contenu |
| --- | --- |
| `fiche.html` | La fiche visuelle, sur le modèle. Le script en tire le PDF et le range dans le Drive. |
| `cartes.json` | Les cartes, au format de l'app de révision. |
| `meta.json` | `{"ue": "UE1", "chapitre": N, "titre": "<Titre court du chapitre>", "slug": "<sujet-en-kebab-case>", "cartes": <nombre>, "resume": "<une phrase sur ce que couvre la fiche>"}` |

Les textes du cours et des documents du professeur sont dans `entrees/` (extraits des PDF). Ne modifie rien en dehors du dossier de travail.

## Démarche

1. **Lis tout le PDF** avant d'écrire. Liste les notions du chapitre et leur logique d'enchaînement.
2. **Compare avec le programme 2027 de l'UE 1.** Repère ce qui manque et ce qui est hors programme.
3. **Vérifie le droit.** Chaque règle, condition, délai, sanction et arrêt doit être contrôlé sur une source fiable : Légifrance en priorité, puis la doctrine ou les sites spécialisés. Les cours contiennent des erreurs : ne les recopie jamais. Légifrance refuse la lecture directe : interroge-le avec WebSearch limité au domaine `legifrance.gouv.fr`. Cite toujours le numéro d'article **en vigueur** (plusieurs codes ont été renumérotés). Une seconde passe indépendante vérifiera ensuite ton travail.
4. **Arrête ton plan** : sections, notions traitées en cartes syllogisme, tableaux, corrections importantes. Personne ne le valide : il doit tenir seul.
5. **Rédige la fiche**, puis les cartes, puis la synthèse de fin de fiche.
6. **Vérifie les cartes** avec `node <pipeline>/tools/check-cards.mjs cartes.json` (le chemin exact t'est donné dans la consigne) et corrige jusqu'à ce qu'il n'y ait plus d'erreur.
7. **Fais la relecture finale** (voir la liste en bas).

Si une règle reste incertaine après recherche, ne l'invente pas : écris-la prudemment et signale-la dans la synthèse de fin de fiche.

## La fiche

### Principes

- **Une fiche à apprendre, pas un cours.** Vise 8 à 10 pages en PDF. Les détails secondaires vont dans les cartes, pas dans la fiche.
- **Tout en syllogisme.** Chaque notion importante est présentée comme l'utilisateur doit la rédiger à l'examen.
- **Pas de numéros d'articles.** L'utilisateur ne les apprend pas. Écris la règle et ses conditions. Seuls les arrêts gardent leur nom et leur date.
- **Toujours la conséquence.** Chaque règle se termine par sa sanction : nullité (absolue ou relative), dommages-intérêts, délai, qui peut agir.
- **Des exemples partout** : c'est ce qui l'aide le plus.

### Structure (dans cet ordre)

1. **En-tête :** UE et chapitre, titre, une phrase d'usage, légende des pastilles de sanction.
2. **Parcours :** 3 à 5 questions qui situent un problème dans le chapitre, chacune renvoyant à sa section. Au chapitre 1 : « Le contrat est-il formé ? valable ? bien exécuté ? supportable ? ». Adapte-les à la logique du chapitre.
3. **Rappel de méthode :** les cinq étapes du syllogisme (faits, problème, majeure, mineure, conclusion). Identique dans toutes les fiches.
4. **Sections numérotées** dans l'ordre logique du chapitre, une couleur de thème chacune.
5. **Arrêts à connaître :** nom ou juridiction, date, règle en une ligne.
6. **Ce qui change par rapport au cours** (dernière section, juste avant le pied de page, classe `t0`) : la synthèse des points importants corrigés ou ajoutés. Voir « La synthèse de fin de fiche ».
7. **Pied de page :** limites et sources consultées.

### La carte syllogisme (bloc principal)

Pour chaque notion susceptible d'un cas pratique :

| Zone | Contenu |
| --- | --- |
| Titre | Le nom de la notion. Badge « Par cœur » si elle est centrale. |
| Question type | La question telle qu'elle tomberait à l'examen, formulée pour un client. |
| **Majeure** | La règle et ses conditions, en 2 à 4 phrases. Mots-clés en gras. Aucun fait. |
| **Mineure** | Une liste à cocher de ce qu'il faut chercher dans l'énoncé, condition par condition. |
| **Conclusion** | La sanction en pastille, puis une phrase sur ce que le client obtient ou non. |
| Pied | Un exemple concret, et si utile un piège ou un mémo. |

Les zones Majeure et Conclusion portent la classe `hideable` : le bouton « Me tester » les masque.

Les notions secondaires vont dans des tableaux de comparaison ou des tuiles, toujours avec une colonne ou une ligne d'exemple.

### Les pastilles de sanction

Utilise toujours la même couleur pour la même famille :

| Classe | Sens | Exemples |
| --- | --- | --- |
| `chip nul` | Le contrat ou l'acte disparaît | Nullité, résolution, caducité |
| `chip di` | De l'argent | Dommages-intérêts, réduction du prix, pénalité |
| `chip exe` | Le contrat est maintenu | Exécution forcée, exception d'inexécution, substitution |
| `chip cl` | Une clause est neutralisée | Clause réputée non écrite, inopposabilité |

### Les exemples

- **Un exemple par règle**, concret et court : des entreprises, des clients de cabinet, des montants plausibles.
- **Un cas fil rouge** quand une notion a plusieurs branches (au chapitre 1, un menuisier qui doit poser une cuisine illustre toutes les sanctions de l'inexécution).
- Montre aussi le **contre-exemple** quand une limite est fréquente (« un prix bas n'est pas forcément dérisoire »).
- **Ne reprends jamais les énoncés des exercices du professeur**, pour ne pas donner les réponses à l'utilisateur.

### Pièges et mémos

- **Piège :** une confusion fréquente ou une erreur du cours (« la bonne foi sanctionne la manière, jamais le contenu »).
- **Mémo :** un moyen mnémotechnique court et vrai (3 C pour les conditions de validité, I P L pour les dommages-intérêts). N'en force pas un s'il n'est pas naturel.

### Couleurs de thème

Les classes `t0` à `t5` donnent la couleur d'une section : `t0` ardoise (principes, arrêts), `t1` sarcelle, `t2` bleu, `t3` violet, `t4` vert, `t5` rouge. Utilise la même couleur pour un thème dans la fiche et dans les cartes (champ `couleur` du JSON : `ardoise`, `sarcelle`, `bleu`, `violet`, `vert`, `rouge`).

### Rédaction

- Français simple, phrases courtes, une idée par phrase. Tutoiement dans les consignes.
- **Vocabulaire juridique exact**, défini en quelques mots à sa première apparition : « la **caducité** (l'offre cesse d'exister) ».
- Explique les termes qu'un débutant ne connaît pas : solennel, excusable, motif, résolution, opposable, etc.
- Distingue toujours la règle (majeure) des faits (mineure).
- Pas de jargon sans définition, pas de paragraphe de plus de trois phrases.

## Les cartes

**D'abord l'existant, ensuite la stratégie.** Avant d'écrire une carte, parcours `existant/` (tous les paquets de l'app) et `existant/archive/` (les cartes retirées par l'utilisateur). Ne crée pas de doublon, même reformulé, même dans un autre chapitre, et ne recrée pas une carte archivée. Décide ensuite combien de cartes la matière justifie vraiment, en visant la résolution des cas d'examen, puis rédige.

Format attendu par l'app de révision (voir `modele/cartes-modele.json`) :

```json
{
  "schema": 1,
  "deck": {
    "id": "ue1-ch02", "ue": "UE1", "ueTitre": "Gestion juridique, fiscale et sociale",
    "chapitre": 2, "titre": "Contrats spéciaux",
    "themes": [{ "id": "vente", "titre": "La vente", "couleur": "bleu", "ordre": 1 }]
  },
  "cards": [
    { "id": "ue1-ch02-001", "theme": "vente", "type": "regle",
      "question": "…", "reponse": "…", "source": "Art. 1641" }
  ]
}
```

Règles :

- **Identifiants :** `ueX-chNN-001`, `-002`, etc., dans l'ordre des thèmes. Un identifiant est définitif : si tu reprends un chapitre existant, ne modifie ni ne réutilise jamais un `id`. Ajoute les nouvelles cartes à la suite.
- **Types :** `regle` (une règle, une condition, une définition, ou une courte application d'une ligne), `cas` (un vrai cas pratique, voir plus bas), `memo` (un moyen mnémotechnique ou une méthode).
- **Une seule idée par carte.** Une question qui appelle une liste de plus de quatre éléments se découpe.
- **Question autonome :** compréhensible sans contexte, sans numéro d'article.
- **Réponse courte :** une à trois lignes (sauf les cas). Retours à la ligne conservés, seul `**gras**` est interprété.
- **Un vrai cas pratique (`cas`)** se distingue d'une carte de règle : un énoncé de 3 à 5 phrases avec des parties nommées, des dates et des montants, comme à l'examen, puis la question, en gras, dans un dernier paragraphe séparé par une ligne vide. La réponse suit exactement quatre lignes : `**Problème** : …`, `**Règle** : …` (conditions et articles), `**Application** : …` (chaque condition confrontée aux faits), `**Conclusion** : …` (réponse nette et conseil). L'app affiche ces quatre étapes séparément. Calque la forme des questions des annales (« Peut-il engager la responsabilité… ? », « Cette clause peut-elle produire effet… ? »), mais invente les faits ; ne reprends ni les annales ni les exercices du professeur.
- **Tri par priorité :** classe chaque carte. **Essentiel** : la règle qui tranche un cas probable à l'examen (ses conditions, sa sanction, son délai), et ce que les **annales du DSCG UE 1** demandent (les rappels de droit commun des contrats y tombent : devoir d'information, vices du consentement, résolution, force majeure, exception d'inexécution, déséquilibre significatif, définitions et qualification des contrats). Les exercices du professeur, parfois volontairement simples, ne suffisent pas à juger. Les nuances, arrêts secondaires, cas rares et détails hors cours restent dans la fiche, **sans carte** : L'utilisateur ajoutera lui-même des cartes en révision s'il en a besoin. Une notion ni au cours ni au programme, sans usage pour un cas, n'a pas de carte.
- **`source` :** l'article ou l'arrêt. C'est le seul endroit où figure le numéro d'article.
- **Arrêts :** un arrêt important (en particulier d'une fiche de jurisprudence du professeur) a sa propre carte, **sauf si sa règle a déjà une carte** dans un paquet de l'app ou dans l'archive : il est alors seulement cité dans la fiche. La question nomme l'arrêt (nom ou juridiction et date), la réponse donne sa solution en une à deux lignes. Si la fiche du professeur se trompe sur un arrêt (formation, date), la carte prend la référence exacte et la synthèse le signale.
- **Couverture :** chaque condition de chaque majeure, chaque sanction et chaque piège de la fiche a au moins une carte.
- **Proportions indicatives :** 6 à 10 vrais `cas` par chapitre, un `memo` de méthode quand le chapitre a une démarche propre, le reste en `regle`.
- **Volume indicatif :** 80 à 120 cartes par chapitre, toutes essentielles. Un détail de la fiche peut ne pas avoir de carte.

## La synthèse de fin de fiche

L'utilisateur relit chaque fiche après coup : cette section lui dit où regarder. Elle est courte (une demi-page au plus) et ne garde que l'important, en trois blocs :

1. **Corrigé par rapport au cours :** ce que disait le cours, ce qui est juste, et la source (lien Légifrance ou arrêt).
2. **Ajouté :** les notions du programme absentes du cours, ou une règle complétée (une ligne chacune).
3. **À vérifier :** ce que tu n'as pas pu confirmer avec certitude. S'il n'y a rien, écris-le.

Pas de détail cosmétique (reformulation, mise en forme) : seulement ce qui change ce que l'utilisateur doit savoir.

## Le PDF et le rangement

Tu ne t'en occupes pas : le script tire le PDF A4 de `fiche.html` (polices embarquées, bouton de test masqué), le range dans `Mon Drive > DSCG > UE X > Chap N - <Titre>` (en créant le dossier s'il manque) sous le nom `Fiche - Chapitre N - <Titre>.pdf`, puis ajoute `cartes.json` à l'app. Garde la fiche lisible en A4 : pas de carte syllogisme plus longue qu'une page.

## Relecture finale

- [ ] Toutes les règles ont été vérifiées sur une source fiable, ou signalées dans la synthèse de fin de fiche.
- [ ] Aucune erreur du cours n'est reprise.
- [ ] Chaque notion importante est en carte syllogisme, avec une sanction et un exemple.
- [ ] Aucun numéro d'article dans la fiche, sauf les dates d'arrêts.
- [ ] Aucun énoncé d'exercice du professeur n'est repris.
- [ ] La fiche fait au plus une dizaine de pages en PDF.
- [ ] Le mode « Me tester » masque bien majeures, conclusions et tableaux.
- [ ] La page s'affiche correctement sur téléphone et en mode sombre.
- [ ] Les cartes sont valides : `check-cards.mjs` ne signale aucune erreur.
- [ ] La synthèse « Ce qui change par rapport au cours » est la dernière section, avant le pied de page.
- [ ] `meta.json` est rempli.
- [ ] Chaque condition, sanction et terme de la fiche a sa carte.
