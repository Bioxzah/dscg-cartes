// Revision fiches bundled with the app, one per deck: fiches/<deckId>.html. Emitted as assets and
// precached by the service worker, so they open offline like the cards.
const urls = import.meta.glob('/fiches/*.html', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

const byDeck = new Map(Object.entries(urls).map(([path, url]) => [path.slice('/fiches/'.length, -'.html'.length), url]));

export function ficheUrl(deckId: string): string | undefined {
  return byDeck.get(deckId);
}
