// Validates every cards/*.json file. Exits with code 1 if any file is invalid, which fails the build.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateAll, type SourceFile } from '../src/cards/validate.ts';

const dir = join(import.meta.dirname, '..', 'cards');
const names = readdirSync(dir).filter((n) => n.endsWith('.json')).sort();

const files: SourceFile[] = [];
const errors: string[] = [];
for (const name of names) {
  try {
    files.push({ name, data: JSON.parse(readFileSync(join(dir, name), 'utf8')) });
  } catch (e) {
    errors.push(`${name} : JSON illisible (${(e as Error).message})`);
  }
}
errors.push(...validateAll(files));

if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) dans cards/ :\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
const total = files.reduce((n, f) => n + (f.data as { cards: unknown[] }).cards.length, 0);
console.log(`✓ ${files.length} fichier(s), ${total} cartes valides`);
