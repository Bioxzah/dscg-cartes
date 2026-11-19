import { useEffect, useRef, useState } from 'react';
import type { Card } from '../cards/types.ts';
import { BLOCK_SELECTOR, indexFiche } from '../fiches/match.ts';

interface Props {
  url: string;
  card: Card;
  title: string;
  onClose: () => void;
}

const HIGHLIGHT_CSS = `
.dscg-here{outline:3px solid #e0a100;outline-offset:4px;border-radius:6px;scroll-margin:24px}
tr.dscg-here{outline:none}
tr.dscg-here>th,tr.dscg-here>td{background:color-mix(in srgb,#ffc928 26%,transparent)!important;box-shadow:inset 0 3px 0 #e0a100,inset 0 -3px 0 #e0a100}
#toggle,.teststate{display:none!important}
.tw table:not(:has(tr>:nth-child(3))){min-width:0!important}
.dscg-here.dscg-flash{animation:dscg-flash 1.2s ease-out 1}
@keyframes dscg-flash{from{outline-color:#ffb300;outline-width:6px}to{outline-color:#e0a100;outline-width:3px}}
html{scroll-behavior:auto}`;

/** The app's own @font-face rules, with absolute URLs, so the fiche needs no web font from the network. */
function appFontFaces(): string {
  const rules: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    const base = sheet.href ?? document.baseURI;
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSFontFaceRule) {
        rules.push(rule.cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (_, q: string, u: string) => `url(${q}${new URL(u, base).href}${q})`));
      }
    }
  }
  return rules.join('\n');
}

/** The fiche's HTML, made self-contained: no Google Fonts request (it can hang offline), app fonts, highlight style. */
function prepare(html: string): string {
  const style = `<style>${appFontFaces()}\n${HIGHLIGHT_CSS}</style>`;
  const clean = html.replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, '');
  return clean.includes('</head>') ? clean.replace('</head>', `${style}</head>`) : style + clean;
}

/** Outermost passages of the fiche, in document order. */
function passages(doc: Document): HTMLElement[] {
  const all = [...doc.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)];
  const set = new Set<Element>(all);
  return all.filter((el) => {
    for (let a = el.parentElement; a; a = a.parentElement) if (set.has(a)) return false;
    return true;
  });
}

/**
 * The revision fiche in a sheet over the card, opened at the passage that explains the card.
 * The app stays underneath: closing the sheet returns to the card as it was.
 */
export function FicheSheet({ url, card, title, onClose }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Read through the service worker cache, so it works offline.
  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => alive && setHtml(prepare(text)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [url]);

  // While open, the sheet owns the keyboard: Escape closes it, other keys do not grade the card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey, true);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const onLoad = () => {
    const doc = frame.current?.contentDocument;
    if (!doc || !html) return;
    const theme = document.documentElement.dataset.theme;
    if (theme) doc.documentElement.dataset.theme = theme;
    doc.addEventListener('keydown', (e) => e.key === 'Escape' && onClose());
    const blocks = passages(doc);
    if (blocks.length > 0) {
      const best = indexFiche(blocks.map((b) => b.textContent ?? '')).best(`${card.question} ${card.reponse}`);
      const el = blocks[best];
      if (el) {
        el.classList.add('dscg-here', 'dscg-flash');
        el.scrollIntoView({ block: 'center' });
      }
    }
    setReady(true);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label={`Fiche : ${title}`} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-top">
          <span className="label sheet-title">{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer la fiche" autoFocus>
            ✕
          </button>
        </header>
        {failed ? (
          <p className="muted sheet-error">La fiche n’a pas pu s’ouvrir. Réessaie une fois connecté.</p>
        ) : (
          html && <iframe ref={frame} className={`sheet-frame${ready ? ' ready' : ''}`} srcDoc={html} title={`Fiche : ${title}`} onLoad={onLoad} />
        )}
      </section>
    </div>
  );
}
