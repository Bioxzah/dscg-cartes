// Usage : node fiche-pdf.cjs <fiche.html> "<sortie.pdf>"
// From the fiche kit: embeds the fonts, lays the fiche out on A4 and hides the test button.
// Uses the installed Google Chrome (playwright-core), so no browser download is needed.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('Usage : node fiche-pdf.cjs <fiche.html> "<sortie.pdf>"'); process.exit(1); }

// The app already ships these fonts.
const fontsDir = path.join(__dirname, '..', '..', 'node_modules', '@fontsource');
const font = (pkg, file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(fontsDir, pkg, 'files', file)).toString('base64');
const faces = [
  ['Atkinson Hyperlegible', 400, 'atkinson-hyperlegible', 'atkinson-hyperlegible-latin-400-normal.woff2'],
  ['Atkinson Hyperlegible', 700, 'atkinson-hyperlegible', 'atkinson-hyperlegible-latin-700-normal.woff2'],
  ['Bricolage Grotesque', 600, 'bricolage-grotesque', 'bricolage-grotesque-latin-600-normal.woff2'],
  ['Bricolage Grotesque', 800, 'bricolage-grotesque', 'bricolage-grotesque-latin-800-normal.woff2'],
  ['IBM Plex Mono', 500, 'ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff2'],
].map(([n, w, p, f]) => `@font-face{font-family:"${n}";font-weight:${w};src:url(${font(p, f)}) format("woff2")}`).join('\n');

(async () => {
  const body = fs.readFileSync(src, 'utf8').replace(/<link rel="stylesheet"[^>]*>/, '');
  const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>body{margin:0}[hidden]{display:none!important}' +
    faces + '</style></head><body>' + body + '</body></html>';
  const tmp = path.join(path.dirname(path.resolve(out)), '.tmp-fiche.html');
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + tmp);
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print', colorScheme: 'light' });
    await page.pdf({ path: out, format: 'A4', scale: 0.68, printBackground: true,
      margin: { top: '11mm', bottom: '11mm', left: '9mm', right: '9mm' } });
  } finally {
    await browser.close();
    fs.unlinkSync(tmp);
  }
  console.log('PDF créé :', out);
})();
