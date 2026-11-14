// Checks a generated cards file before it reaches the app.
// Usage: node pipeline/tools/check-cards.mjs <cartes.json> [expected deck id] [--extends <cards/deck.json>]
// --extends: update of an existing deck. Its cards must stay exactly as they are (ids are
// definitive and carry the progress); new cards go after them, numbered from the highest id + 1.
// Exit 1 with a list of errors (French) when the file cannot be used.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validateAll } from '../../src/cards/validate.ts';

const argv = process.argv.slice(2);
const extIndex = argv.indexOf('--extends');
const extendsFile = extIndex >= 0 ? argv[extIndex + 1] : null;
if (extIndex >= 0) argv.splice(extIndex, 2);
const [file, expectedDeck] = argv;
if (!file) {
  console.error('Usage : node check-cards.mjs <cartes.json> [ue1-chNN]');
  process.exit(2);
}

const errors = [];
const warnings = [];
let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ JSON illisible : ${e.message}`);
  process.exit(1);
}

// Same rules as the app's build, checked against the other decks of the repo (card ids are global).
const cardsDir = join(import.meta.dirname, '..', '..', 'cards');
const repoDecks = readdirSync(cardsDir)
  .filter((n) => n.endsWith('.json'))
  .map((name) => ({ name, data: JSON.parse(readFileSync(join(cardsDir, name), 'utf8')) }));
const deckId = data?.deck?.id;
const clash = repoDecks.find((f) => f.data?.deck?.id === deckId);
let base = null;
if (extendsFile) {
  base = JSON.parse(readFileSync(extendsFile, 'utf8'));
  if (base.deck?.id !== deckId) errors.push(`mise à jour : deck.id « ${deckId} » au lieu de « ${base.deck?.id} »`);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  base.deck.themes.forEach((t, i) => {
    if (!same(t, data?.deck?.themes?.[i])) errors.push(`mise à jour : le thème « ${t.id} » a changé ou a bougé (les thèmes existants restent tels quels, les nouveaux vont à la fin)`);
  });
  base.cards.forEach((c, i) => {
    if (!same(c, data?.cards?.[i])) errors.push(`mise à jour : la carte existante ${c.id} a été modifiée ou déplacée (interdit : signale le problème dans la synthèse)`);
  });
} else if (clash) {
  errors.push(`le paquet ${deckId} existe déjà (cards/${clash.name}) : ses identifiants ne doivent jamais être régénérés`);
}
const others = repoDecks.filter((f) => f !== clash);
errors.push(...validateAll([...others, { name: 'cartes.json', data }]).filter((e) => e.startsWith('cartes.json')));
if (expectedDeck && deckId !== expectedDeck) errors.push(`deck.id vaut « ${deckId} », attendu « ${expectedDeck} »`);

const cards = Array.isArray(data?.cards) ? data.cards : [];
const kept = base ? base.cards.length : 0;
const highest = base ? Math.max(0, ...base.cards.map((c) => Number(String(c.id).split('-').pop()) || 0)) : 0;
cards.forEach((c, i) => {
  if (i < kept) return;
  const want = `${deckId}-${String(highest + (i - kept) + 1).padStart(3, '0')}`;
  if (c.id !== want) errors.push(`carte n°${i + 1} : identifiant « ${c.id} », attendu « ${want} » (numérotation continue${base ? ` après ${highest}` : ' à partir de 001'})`);
  if (/\b(art\.|article)\s*\d/i.test(c.question ?? '')) warnings.push(`${c.id} : numéro d'article dans la question`);
  if ((c.reponse ?? '').split(/\s+/).length > 45) warnings.push(`${c.id} : réponse longue (${c.reponse.split(/\s+/).length} mots)`);
});
const n = cards.length;
if (!base && (n < 100 || n > 260)) warnings.push(`${n} cartes (repère : 150 à 250)`);
if (base && n === kept) warnings.push('aucune carte ajoutée');
const share = (t) => (n ? cards.filter((c) => c.type === t).length / n : 0);
if (share('cas') < 0.15) warnings.push(`seulement ${Math.round(share('cas') * 100)} % de cas pratiques (repère : 25 %)`);

for (const w of warnings) console.log(`! ${w}`);
if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) :\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(base ? `✓ ${n - kept} cartes ajoutées aux ${kept} de ${deckId}` : `✓ ${n} cartes valides pour ${deckId}`);
