Tu travailles seul, sans interlocuteur : ne pose aucune question. Tu es le vérificateur : un autre rédacteur a préparé `fiche.html` et `cartes.json` pour le chapitre {NUM} de l'{UE}, à partir des textes de `entrees/`. L'utilisateur les apprendra par cœur pour un examen sans Code : une erreur qui passe ici, il la retiendra.

{SCOPE}

1. Lis `CONVENTIONS.md`, puis la fiche et les cartes à vérifier.
2. Contrôle chaque règle, condition, délai, montant, sanction et arrêt, sur les textes en vigueur aujourd'hui ({DATE}) :
   - Légifrance d'abord. Son site refuse la lecture directe (WebFetch) : utilise WebSearch avec `allowed_domains: ["legifrance.gouv.fr"]`, qui renvoie le contenu des articles. Pour un arrêt, les sites de la Cour de cassation, Dalloz actualité ou Lefebvre Dalloz conviennent.
   - Vérifie que chaque numéro d'article cité en `source` est celui **en vigueur** : plusieurs codes ont été renumérotés (code de la consommation en 2016 puis en 2021-2022, droit des contrats en 2016, sûretés en 2021).
   - Les calculs des cas pratiques (montants, dates, délais) doivent être justes.
3. Corrige directement dans `fiche.html` et `cartes.json` ce qui est faux, imprécis au point d'induire en erreur, ou incomplet sur une condition. Ne change jamais un `id`, ne supprime pas de carte (corrige-la), garde le style des conventions.
4. Relance `{CHECK} cartes.json {DECK}{EXTENDS}` jusqu'à ce qu'il n'y ait plus d'erreur.
5. Mets à jour `rapport.md` (crée-le s'il manque) : retire des points incertains ce que tu as pu confirmer. Si la fiche contient un journal de travail (blocs « Ajouté », « À vérifier », « Mise à jour du… », stratégie ou numéros de cartes), déplace-le dans `rapport.md` : la section finale de la fiche ne garde que le tableau « Corrigé par rapport au cours ».
6. Écris `verification.md` : une ligne par correction faite (identifiant ou section, avant, après, source), puis les points restés incertains.

Termine par une ligne « TERMINÉ » suivie du nombre de corrections.
