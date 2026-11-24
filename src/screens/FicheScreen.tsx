import { chapterLabel } from '../cards/catalog.ts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { themeStyle } from '../components/themeStyle.ts';
import { useAppData } from '../data/AppData.tsx';
import { ficheUrl } from '../fiches/fiches.ts';
import { prepareFiche, shareTheme } from '../fiches/frame.ts';
import { ficheSections } from '../fiches/library.ts';
import { NotFound } from './NotFound.tsx';

// The fiche's own sections get a little room under the reader's header when jumped to.
const READER_CSS = `.stage{scroll-margin-top:12px}html{scroll-behavior:auto}`;

// Where each fiche was left, on this device only: a convenience, not synced.
const scrollKey = (deckId: string) => `dscg-fiche-scroll:${deckId}`;
function readScroll(deckId: string): number {
  try {
    return Number(localStorage.getItem(scrollKey(deckId))) || 0;
  } catch {
    return 0;
  }
}
function saveScroll(deckId: string, y: number): void {
  try {
    localStorage.setItem(scrollKey(deckId), String(Math.round(y)));
  } catch {
    // Private browsing or storage blocked: the fiche just opens at the top next time.
  }
}

/** A fiche read for itself, full screen, with its table of contents. */
export function FicheScreen() {
  const { deckId = '' } = useParams();
  const { catalog } = useAppData();
  const url = ficheUrl(deckId);
  const deck = useMemo(() => catalog.tree.flatMap((ue) => ue.chapters).find((ch) => ch.deck.id === deckId)?.deck, [catalog, deckId]);
  const frame = useRef<HTMLIFrameElement>(null);
  const [raw, setRaw] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const sections = useMemo(() => (raw ? ficheSections(raw) : []), [raw]);
  const html = useMemo(() => (raw ? prepareFiche(raw, READER_CSS) : null), [raw]);

  // Read through the service worker cache, so it works offline.
  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => alive && setRaw(text))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [url]);

  useEffect(() => {
    if (!tocOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setTocOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tocOpen]);

  if (!url) return <NotFound />;
  const title = deck ? deck.titre : deckId;

  const onLoad = () => {
    const win = frame.current?.contentWindow;
    const doc = frame.current?.contentDocument;
    if (!win || !doc) return;
    shareTheme(doc);
    win.scrollTo(0, readScroll(deckId));
    let timer = 0;
    win.addEventListener('scroll', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => saveScroll(deckId, win.scrollY), 250);
    });
    setReady(true);
  };

  const jump = (id: string) => {
    setTocOpen(false);
    frame.current?.contentDocument?.getElementById(id)?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="reader">
      <header className="reader-top">
        <Link className="back" to="/fiches">‹ Fiches</Link>
        <div className="reader-title">
          {deck && <span className="label">{deck.ue} · {chapterLabel(deck.chapitre)}</span>}
          <span className="ellipsis">{title}</span>
        </div>
        {sections.length > 0 && (
          <button className="toc-btn" aria-expanded={tocOpen} onClick={() => setTocOpen((o) => !o)}>
            Sommaire
          </button>
        )}
      </header>
      <div className="reader-body">
        {failed ? (
          <p className="muted sheet-error">La fiche n’a pas pu s’ouvrir. Réessaie une fois connecté.</p>
        ) : (
          html && <iframe ref={frame} className={`reader-frame${ready ? ' ready' : ''}`} srcDoc={html} title={`Fiche : ${title}`} onLoad={onLoad} />
        )}
        {tocOpen && (
          <>
            <button className="toc-backdrop" aria-label="Fermer le sommaire" onClick={() => setTocOpen(false)} />
            <nav className="toc panel" aria-label="Sommaire de la fiche">
              <ul className="rows">
                {sections.map((s) => (
                  <li key={s.id}>
                    <button className="row toc-row" style={themeStyle(s.couleur)} onClick={() => jump(s.id)}>
                      <span className="toc-n">{s.n}</span>
                      <span className="row-main row-title">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
      </div>
    </div>
  );
}
