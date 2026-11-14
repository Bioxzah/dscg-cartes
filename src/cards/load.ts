// Embeds every cards/*.json at build time. Adding a chapter needs no code change.
import { buildCatalog } from './catalog.ts';
import { assertDeckFiles } from './validate.ts';

const modules = import.meta.glob<unknown>('../../cards/*.json', { eager: true, import: 'default' });

const files = Object.entries(modules).map(([path, data]) => ({ name: path.split('/').pop() ?? path, data }));

export const catalog = buildCatalog(assertDeckFiles(files));
