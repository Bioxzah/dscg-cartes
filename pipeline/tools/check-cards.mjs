// Checks a generated cards file before it reaches the app.
// Usage: node pipeline/tools/check-cards.mjs <cartes.json> [expected deck id]
// Exit 1 with a list of errors (French) when the file cannot be used.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validateAll } from '../../src/cards/validate.ts';

const [file, expectedDeck] = process.argv.slice(2);
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
if (clash) errors.push(`le paquet ${deckId} existe déjà (cards/${clash.name}) : ses identifiants ne doivent jamais être régénérés`);
const others = repoDecks.filter((f) => f !== clash);
errors.push(...validateAll([...others, { name: 'cartes.json', data }]).filter((e) => e.startsWith('cartes.json')));
if (expectedDeck && deckId !== expectedDeck) errors.push(`deck.id vaut « ${deckId} », attendu « ${expectedDeck} »`);

const cards = Array.isArray(data?.cards) ? data.cards : [];
cards.forEach((c, i) => {
  const want = `${deckId}-${String(i + 1).padStart(3, '0')}`;
  if (c.id !== want) errors.push(`carte n°${i + 1} : identifiant « ${c.id} », attendu « ${want} » (numérotation continue à partir de 001)`);
  if (/\b(art\.|article)\s*\d/i.test(c.question ?? '')) warnings.push(`${c.id} : numéro d'article dans la question`);
  if ((c.reponse ?? '').split(/\s+/).length > 45) warnings.push(`${c.id} : réponse longue (${c.reponse.split(/\s+/).length} mots)`);
});
const n = cards.length;
if (n < 100 || n > 260) warnings.push(`${n} cartes (repère : 150 à 250)`);
const share = (t) => (n ? cards.filter((c) => c.type === t).length / n : 0);
if (share('cas') < 0.15) warnings.push(`seulement ${Math.round(share('cas') * 100)} % de cas pratiques (repère : 25 %)`);

for (const w of warnings) console.log(`! ${w}`);
if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) :\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ ${n} cartes valides pour ${deckId}`);
