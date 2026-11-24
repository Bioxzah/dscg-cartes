import { CARD_TYPES, THEME_COLORS, type DeckFile } from './types.ts';

export interface SourceFile {
  name: string;
  data: unknown;
}

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

const DECK_KEYS = ['id', 'ue', 'ueTitre', 'chapitre', 'titre', 'themes'];
const THEME_KEYS = ['id', 'titre', 'couleur', 'ordre'];
const CARD_KEYS = ['id', 'theme', 'type', 'question', 'reponse', 'source', 'choix', 'bonne', 'journal'];
const LINE_KEYS = ['compte', 'intitule', 'debit', 'credit'];
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

function unknownKeys(o: Obj, allowed: string[], where: string, errors: string[]) {
  for (const k of Object.keys(o)) {
    if (!allowed.includes(k)) errors.push(`${where} : champ inconnu « ${k} »`);
  }
}

/** Checks one deck file. Returns a list of human-readable errors (empty when valid). */
export function validateDeckFile(file: SourceFile): string[] {
  const errors: string[] = [];
  const at = file.name;
  const d = file.data;

  if (!isObj(d)) return [`${at} : le fichier doit contenir un objet JSON`];
  if (d.schema !== 1) errors.push(`${at} : « schema » doit valoir 1`);
  unknownKeys(d, ['schema', 'deck', 'cards'], at, errors);

  const themeIds = new Set<string>();
  const deck = d.deck;
  if (!isObj(deck)) {
    errors.push(`${at} : « deck » manquant ou invalide`);
  } else {
    unknownKeys(deck, DECK_KEYS, `${at} deck`, errors);
    for (const k of ['id', 'ue', 'ueTitre', 'titre']) {
      if (!isText(deck[k])) errors.push(`${at} deck : « ${k} » doit être un texte non vide`);
    }
    if (!Number.isInteger(deck.chapitre)) errors.push(`${at} deck : « chapitre » doit être un entier`);
    if (!Array.isArray(deck.themes) || deck.themes.length === 0) {
      errors.push(`${at} deck : « themes » doit être une liste non vide`);
    } else {
      deck.themes.forEach((t, i) => {
        const w = `${at} thème n°${i + 1}`;
        if (!isObj(t)) return errors.push(`${w} : objet attendu`);
        unknownKeys(t, THEME_KEYS, w, errors);
        if (!isText(t.id)) errors.push(`${w} : « id » doit être un texte non vide`);
        else if (themeIds.has(t.id)) errors.push(`${w} : identifiant de thème en double « ${t.id} »`);
        else themeIds.add(t.id);
        if (!isText(t.titre)) errors.push(`${w} : « titre » doit être un texte non vide`);
        if (!THEME_COLORS.includes(t.couleur as never)) {
          errors.push(`${w} : couleur « ${String(t.couleur)} » inconnue (${THEME_COLORS.join(', ')})`);
        }
        if (typeof t.ordre !== 'number') errors.push(`${w} : « ordre » doit être un nombre`);
      });
    }
  }

  if (!Array.isArray(d.cards)) {
    errors.push(`${at} : « cards » doit être une liste`);
  } else {
    d.cards.forEach((c, i) => {
      const w = `${at} carte n°${i + 1}${isObj(c) && isText(c.id) ? ` (${c.id})` : ''}`;
      if (!isObj(c)) return errors.push(`${w} : objet attendu`);
      unknownKeys(c, CARD_KEYS, w, errors);
      if (!isText(c.id)) errors.push(`${w} : « id » doit être un texte non vide`);
      if (!isText(c.theme)) errors.push(`${w} : « theme » doit être un texte non vide`);
      else if (themeIds.size > 0 && !themeIds.has(c.theme)) {
        errors.push(`${w} : thème « ${c.theme} » absent de deck.themes`);
      }
      if (!CARD_TYPES.includes(c.type as never)) {
        errors.push(`${w} : type « ${String(c.type)} » inconnu (${CARD_TYPES.join(', ')})`);
      }
      if (!isText(c.question)) errors.push(`${w} : « question » doit être un texte non vide`);
      if (!isText(c.reponse)) errors.push(`${w} : « reponse » doit être un texte non vide`);
      if (c.source !== undefined && typeof c.source !== 'string') {
        errors.push(`${w} : « source » doit être un texte`);
      }
      if (c.type === 'qcm') {
        const choix = Array.isArray(c.choix) ? c.choix : [];
        const ok = choix.length >= 2 && choix.length <= 5 && choix.every(isText);
        if (!ok) errors.push(`${w} : un qcm a de 2 à 5 « choix » non vides`);
        else if (!Number.isInteger(c.bonne) || (c.bonne as number) < 0 || (c.bonne as number) >= choix.length) {
          errors.push(`${w} : « bonne » doit être l'indice d'un des choix`);
        }
      } else if (c.choix !== undefined || c.bonne !== undefined) {
        errors.push(`${w} : « choix » et « bonne » sont réservés aux qcm`);
      }
      if (c.journal !== undefined) {
        if (c.type !== 'ecriture') errors.push(`${w} : « journal » est réservé aux écritures`);
        if (!Array.isArray(c.journal) || c.journal.length < 2) {
          errors.push(`${w} : « journal » doit avoir au moins deux lignes`);
        } else {
          let debit = 0;
          let credit = 0;
          c.journal.forEach((l, j) => {
            const lw = `${w} ligne ${j + 1}`;
            if (!isObj(l)) return errors.push(`${lw} : objet attendu`);
            unknownKeys(l, LINE_KEYS, lw, errors);
            if (!isText(l.compte) || !isText(l.intitule)) errors.push(`${lw} : « compte » et « intitule » sont requis`);
            const d = l.debit !== undefined;
            const k = l.credit !== undefined;
            if (d === k) return errors.push(`${lw} : soit « debit », soit « credit »`);
            const v = d ? l.debit : l.credit;
            if (!isAmount(v)) return errors.push(`${lw} : montant positif attendu`);
            if (d) debit += v;
            else credit += v;
          });
          if (Math.abs(debit - credit) > 0.005) errors.push(`${w} : écriture déséquilibrée (débit ${debit}, crédit ${credit})`);
        }
      }
    });
  }

  return errors;
}

/** Checks every deck file, plus rules that span files: unique deck ids and unique card ids repo-wide. */
export function validateAll(files: SourceFile[]): string[] {
  const errors = files.flatMap(validateDeckFile);
  const deckOwner = new Map<string, string>();
  const cardOwner = new Map<string, string>();

  for (const f of files) {
    if (!isObj(f.data)) continue;
    const deck = f.data.deck;
    if (isObj(deck) && isText(deck.id)) {
      const prev = deckOwner.get(deck.id);
      if (prev) errors.push(`${f.name} : paquet « ${deck.id} » déjà défini dans ${prev}`);
      else deckOwner.set(deck.id, f.name);
    }
    if (!Array.isArray(f.data.cards)) continue;
    for (const c of f.data.cards) {
      if (!isObj(c) || !isText(c.id)) continue;
      const prev = cardOwner.get(c.id);
      if (prev) errors.push(`${f.name} : identifiant de carte en double « ${c.id} » (déjà dans ${prev})`);
      else cardOwner.set(c.id, f.name);
    }
  }
  return errors;
}

export function assertDeckFiles(files: SourceFile[]): DeckFile[] {
  const errors = validateAll(files);
  if (errors.length) throw new Error(`Cartes invalides :\n${errors.join('\n')}`);
  return files.map((f) => f.data as DeckFile);
}
