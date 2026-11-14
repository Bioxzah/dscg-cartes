# DSCG Cartes : cahier des charges

Web app personnelle de révision par répétition espacée pour le DSCG. Elle remplace AnkiWeb pour un seul utilisateur, Hugo, sur iPhone et Mac. Examen visé : octobre 2027 (UE 1, UE 4).

## 1. Objectif

Réviser ses cartes en 15 à 20 minutes par jour, sur iPhone et sur Mac, avec une progression synchronisée, une interface rapide et le style visuel des fiches.

Critères de réussite de la version 1 :

- Une session du jour se lance en un geste et fonctionne hors connexion.
- Une révision faite sur l'iPhone apparaît sur le Mac après synchronisation, et inversement.
- Le tableau de bord montre la maîtrise par thème et les cartes faibles.
- Ajouter un chapitre revient à déposer un fichier JSON dans `cards/`.

## 2. Hors périmètre de la version 1

- Création ou modification de cartes dans l'app (les cartes viennent des fichiers JSON).
- Plusieurs utilisateurs, partage, classement.
- Images, audio, formules.
- Import de paquets Anki et reprise de la progression Anki.
- Notifications.

## 3. Choix techniques

| Sujet | Choix |
| --- | --- |
| Socle | Vite, React, TypeScript (strict) |
| Style | CSS simple avec les variables de `docs/design-tokens.css`, sans framework CSS |
| Polices | Bricolage Grotesque (titres), Atkinson Hyperlegible (texte), IBM Plex Mono (étiquettes), auto-hébergées via `@fontsource` pour le hors-ligne |
| Planification | `ts-fsrs` (FSRS), rétention visée 0,90 |
| Stockage local | IndexedDB via Dexie |
| Synchronisation | Supabase (Postgres, authentification, sécurité par ligne) |
| Hors-ligne et installation | `vite-plugin-pwa` (manifest, service worker) |
| Navigation | React Router en mode hash, pour GitHub Pages |
| Tests | Vitest sur la logique de planification, de session et de synchronisation |
| Déploiement | GitHub Actions vers GitHub Pages, dépôt public |

Aucune autre dépendance sans raison claire.

## 4. Données

### 4.1 Cartes (fichiers du dépôt)

Un fichier par chapitre dans `cards/`, par exemple `cards/ue1-ch01-contrats.json`. Les fichiers sont embarqués au build.

```json
{
  "schema": 1,
  "deck": {
    "id": "ue1-ch01", "ue": "UE1", "ueTitre": "Gestion juridique, fiscale et sociale",
    "chapitre": 1, "titre": "Droit des contrats",
    "themes": [{ "id": "formation", "titre": "Formation du contrat", "couleur": "bleu", "ordre": 1 }]
  },
  "cards": [
    { "id": "ue1-ch01-021", "theme": "formation", "type": "cas",
      "question": "…", "reponse": "…", "source": "Art. 1114" }
  ]
}
```

Règles :

- `id` est définitif. Il ne change jamais et n'est jamais réutilisé, même si la carte est réécrite ou supprimée. La progression est rattachée à cet identifiant.
- `type` vaut `regle`, `cas` ou `memo`. D'autres types viendront (`ecriture`, `calcul` pour l'UE 4) : prévoir un rendu par type, avec repli sur `regle`.
- `reponse` est du texte simple. Les retours à la ligne sont conservés. Seul `**gras**` est interprété.
- `source` est affichée en petit sous la réponse. Elle est facultative.
- `couleur` vaut `bleu`, `violet`, `rouge`, `sarcelle`, `vert` ou `ardoise` (voir les variables de couleur).
- Une carte retirée d'un fichier disparaît des sessions. Son historique est conservé.
- Valider les fichiers au build (schéma, identifiants uniques dans tout le dépôt, thème existant). Un fichier invalide fait échouer le build.

### 4.2 Progression

La source de vérité est le journal des révisions. L'état de chaque carte (stabilité, difficulté, échéance) est recalculé en rejouant le journal avec FSRS, puis mis en cache localement.

Une révision : `id` (uuid créé sur l'appareil), `card_id`, `rating` (1 à revoir, 3 correct, 4 facile), `reviewed_at`, `duration_ms`, `device`, `annulee` (booléen), `libre` (booléen : révision faite en session libre, qui ne compte pas dans les limites du jour).

Conséquence : fusionner deux appareils revient à réunir leurs journaux. Il n'y a pas de conflit d'état à arbitrer. Le rejeu doit être déterministe : mêmes révisions, même état, quel que soit l'appareil.

### 4.3 Réglages

Un seul objet par utilisateur : nouvelles cartes par jour (15 par défaut), plafond de révisions par jour (100), thèmes en pause, date de l'examen (1er octobre 2027 par défaut, modifiable), heure de changement de jour (4 h), marge avant l'examen pour avoir vu toutes les cartes (60 jours par défaut, décision du jalon 5). En cas de conflit, la version la plus récente l'emporte.

### 4.4 Schéma Supabase

```sql
create table reviews (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users,
  card_id text not null,
  rating smallint not null check (rating in (1, 2, 3, 4)),
  reviewed_at timestamptz not null,
  duration_ms integer,
  device text,
  annulee boolean not null default false,
  libre boolean not null default false,
  updated_at timestamptz not null default now()
);
create index reviews_user_updated on reviews (user_id, updated_at);

create table settings (
  user_id uuid primary key default auth.uid() references auth.users,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table reviews enable row level security;
alter table settings enable row level security;
create policy "reviews du proprietaire" on reviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "settings du proprietaire" on settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Ajouter un déclencheur qui met `updated_at` à `now()` à chaque écriture sur `reviews`. Le fichier SQL complet vit dans `supabase/schema.sql`.

### 4.5 Synchronisation

- L'app est d'abord locale : tout fonctionne sans réseau ni compte.
- Envoi : les révisions locales non envoyées partent par lots (`upsert` sur `id`, donc rejouable sans doublon).
- Réception : on demande les lignes dont `updated_at` dépasse le dernier curseur reçu, puis on fusionne et on recalcule les cartes touchées.
- Déclencheurs : ouverture de l'app, retour au premier plan, fin de session, retour du réseau, bouton manuel.
- Annuler une note : la révision passe à `annulee = true` (jamais de suppression).
- Connexion : adresse e-mail et mot de passe. Pas de lien magique : sur iPhone, le lien s'ouvre dans Safari et non dans l'app installée.
- L'état de synchronisation est visible : à jour, en attente (n révisions), erreur.

## 5. Planification

- FSRS via `ts-fsrs`, rétention visée 0,90, étapes courtes activées : une carte ratée revient dans la même session.
- Étapes courtes de 5 minutes (décision du jalon 2, fondée sur la recherche sur la pratique du rappel : Karpicke et Roediger 2007, Pyc et Rawson 2009, Rawson et Dunlosky 2011). Une carte ratée, ou une nouvelle carte notée « Correct », revient environ 5 minutes plus tard ; un rappel réussi après ce délai la confie à FSRS pour les jours suivants. « Facile » sur une nouvelle carte la fait passer directement aux jours suivants.
- Trois boutons : « À revoir » (1), « Correct » (3), « Facile » (4). La note « Difficile » (2) n'est pas proposée.
- Session du jour, dans cet ordre de priorité :
  1. cartes en cours d'apprentissage arrivées à échéance ;
  2. révisions dues, mélangées entre thèmes et chapitres, jusqu'au plafond ;
  3. nouvelles cartes, jusqu'à la limite du jour, prises dans les thèmes actifs, par ordre de thème puis de fichier, et réparties au fil de la session.
- Une journée commence à 4 h, heure locale.
- Une carte ratée ne revient pas avant au moins trois autres cartes, sauf s'il n'en reste plus.
- « Session libre » : réviser un thème choisi sans attendre l'échéance. Ces révisions comptent dans le journal. Au plus 20 cartes : d'abord celles dont la probabilité de rappel est la plus faible, puis des nouvelles. Elles ne comptent pas dans les limites du jour (champ `libre`).

La logique de planification et de composition de session est un module pur, sans accès au stockage ni à l'horloge (l'heure est passée en paramètre), couvert par des tests.

## 6. Écrans

### 6.1 Aujourd'hui (accueil)

- Bouton principal « Réviser » avec le nombre de cartes : dues, nouvelles, en apprentissage.
- Compte à rebours jusqu'à l'examen.
- Série de jours consécutifs et temps passé aujourd'hui.
- État de synchronisation.
- État vide : « Rien à réviser aujourd'hui », avec la prochaine échéance et l'accès à la session libre.

### 6.2 Session

- Une carte à la fois : bandeau de la couleur du thème, étiquette (thème, et « Cas pratique » ou « Mémo »), question.
- Révéler : toucher la carte ou barre d'espace. La réponse apparaît dans un encadré teinté, la source en petit dessous.
- Noter : trois boutons en bas d'écran, à portée de pouce. Clavier : 1, 2, 3. Chaque bouton affiche le prochain intervalle (« 10 min », « 3 j », « 8 j »).
- Annuler la dernière note : bouton discret et touche Z.
- Progression de la session en haut (cartes restantes).
- Pour les cartes `cas` : un champ facultatif « Ma réponse » avant de révéler, puis une grille d'auto-évaluation (règle citée, conditions vérifiées dans les faits, conclusion et sanction). La note reste donnée par les trois boutons. Le texte saisi n'est pas conservé.
- Fin de session : récapitulatif (cartes vues, taux de réussite, temps), puis retour à l'accueil.
- Aucune animation bloquante. Le passage d'une carte à l'autre est immédiat.

### 6.3 Paquets

- Arborescence UE, chapitre, thème, avec pour chaque thème : nouvelles, en apprentissage, maîtrisées.
- Interrupteur « en pause » par thème et par chapitre : aucune nouvelle carte n'en sort, les révisions dues continuent.
- Liste des cartes d'un thème, avec recherche et accès à la question, à la réponse et à l'historique d'une carte.

### 6.4 Tableau de bord

- Maîtrise par UE, chapitre et thème : part des cartes nouvelles, en apprentissage, maîtrisées. Une carte est « maîtrisée » quand sa stabilité atteint 21 jours.
- Charge prévue sur les 14 prochains jours (cartes dues par jour).
- Taux de réussite sur 30 jours (part des révisions notées « Correct » ou « Facile » sur les cartes déjà apprises).
- Activité des 12 dernières semaines (une case par jour).
- Cartes faibles : ratées au moins deux fois, ou ratées à la dernière révision. Tri par nombre d'échecs.
- Bouton « Copier mes points faibles » : copie en texte la liste des cartes faibles (thème, question, nombre d'échecs), pour la transmettre à Claude et cibler les exercices.
- Projection : nombre de cartes qui seront maîtrisées à la date de l'examen au rythme actuel, et nombre de nouvelles cartes par jour nécessaire pour tout voir avant. Simulation FSRS jour par jour (taux de réussite observé, rythme des 14 derniers jours), calculée dans un Web Worker. « Tout voir avant » vise la date de l'examen moins la marge réglable (60 jours par défaut).

### 6.5 Réglages

- Limites quotidiennes, date de l'examen.
- Compte : connexion, déconnexion, état et bouton de synchronisation.
- Sauvegarde : exporter et importer la progression en JSON (journal et réglages).
- Thème clair, sombre ou automatique.
- Version de l'app et date du dernier déploiement.

## 7. Interface

- Conçue d'abord pour l'iPhone, en une colonne. Sur Mac, largeur de lecture limitée et raccourcis clavier.
- Variables de couleur, clair et sombre : `docs/design-tokens.css`. Une couleur par thème, la même que dans les fiches.
- Navigation par barre d'onglets en bas sur téléphone (Aujourd'hui, Paquets, Tableau de bord, Réglages), masquée pendant une session.
- Zones tactiles d'au moins 44 px. Respect des zones sûres de l'iPhone (encoche, barre d'accueil).
- Texte de carte lisible : 20 px minimum pour la question.
- Focus clavier visible, contrastes suffisants, respect de `prefers-reduced-motion`.
- Textes de l'interface en français, tutoiement.

## 8. Application installable

- Manifest (nom « DSCG Cartes », icônes, couleur de thème), installation sur l'écran d'accueil de l'iPhone.
- Hors-ligne complet : interface, polices et cartes en cache. Les révisions hors-ligne partent à la reconnexion.
- Mise à jour : quand une nouvelle version est disponible, un bandeau propose de recharger. Jamais de rechargement en pleine session.
- Demander le stockage persistant (`navigator.storage.persist()`).

## 9. Sécurité et déploiement

- Le dépôt est public. Ne jamais y mettre la clé `service_role` de Supabase, ni aucun mot de passe.
- L'URL du projet et la clé publique (`anon`) de Supabase sont des variables du dépôt, injectées au build (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Elles sont publiques par nature : la protection repose sur la sécurité par ligne.
- Les inscriptions sont désactivées dans Supabase une fois le compte de Hugo créé.
- Sans variables Supabase, l'app fonctionne en mode local seul.
- GitHub Actions : à chaque push sur `main`, validation des cartes, tests, build, déploiement sur Pages. Le chemin de base est celui du dépôt.
- Une tâche planifiée hebdomadaire interroge Supabase pour éviter la mise en pause du projet gratuit.

## 10. Jalons

Chaque jalon se termine par une version déployée et utilisable.

1. **Socle.** Projet, variables de style, polices, navigation, chargement et validation des cartes, écran Paquets en lecture seule, déploiement sur Pages.
2. **Réviser.** Journal local, FSRS, composition de la session, écran Session, écran Aujourd'hui, réglages des limites et des pauses. Tests de la planification.
3. **Installer.** Manifest, hors-ligne, mise à jour, zones sûres, export et import de sauvegarde.
4. **Synchroniser.** Schéma Supabase, connexion, envoi et réception, état de synchronisation. Tests de fusion des journaux.
5. **Piloter.** Tableau de bord complet, cartes faibles, copie des points faibles, projection.

Après la version 1 : cartes `ecriture` et `calcul` pour l'UE 4, liens des cartes vers les fiches, rappels.

## 11. Vérifications attendues

- Tests : rejeu déterministe du journal, composition de session (priorités, limites, pauses, changement de jour à 4 h), annulation, fusion de deux journaux, validation des fichiers de cartes.
- Vérification manuelle à chaque jalon sur iPhone (Safari et app installée) et sur Mac.
- Scénario de synchronisation : 10 révisions sur l'iPhone hors-ligne, 10 autres sur le Mac, reconnexion, mêmes échéances des deux côtés.
