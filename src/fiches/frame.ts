// Shared by the fiche sheet (from a card) and the fiche reader (fiches tab): loads a bundled fiche
// into an iframe, self-contained and offline.

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

/** The fiche's HTML, made self-contained: no Google Fonts request (it can hang offline), app fonts, extra style. */
export function prepareFiche(html: string, extraCss: string): string {
  const style = `<style>${appFontFaces()}\n${extraCss}</style>`;
  const clean = html.replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, '');
  return clean.includes('</head>') ? clean.replace('</head>', `${style}</head>`) : style + clean;
}

/** Gives the fiche the app's explicit light/dark choice, if any. */
export function shareTheme(doc: Document): void {
  const theme = document.documentElement.dataset.theme;
  if (theme) doc.documentElement.dataset.theme = theme;
}
