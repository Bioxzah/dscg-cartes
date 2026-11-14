// Renders scripts/icon/icon.html to the PNG icons in public/. Needs Google Chrome; run by hand when the icon changes:
//   node scripts/icon/render.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const here = import.meta.dirname;
// file:// pages cannot fetch the font, so it is injected as a FontFace before each capture.
const font = readFileSync(join(here, 'bricolage-800.woff2')).toString('base64');
const out = join(here, '..', '..', 'public');
const targets = [
  { file: 'pwa-192.png', size: 192 },
  { file: 'pwa-512.png', size: 512 },
  { file: 'pwa-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-64.png', size: 64 },
];

const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'icon-'))}`, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
let list;
for (let i = 0; i < 50 && !list; i++) {
  await new Promise((r) => setTimeout(r, 200));
  try { list = await (await fetch('http://127.0.0.1:9334/json/list')).json(); } catch {}
}
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const waiting = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); waiting.get(m.id)?.(m); });
const send = (method, params = {}) => new Promise((r) => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });

try {
for (const t of targets) {
  await send('Emulation.setDeviceMetricsOverride', { width: t.size, height: t.size, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `file://${join(here, 'icon.html')}?size=${t.size}${t.maskable ? '&maskable' : ''}` });
  await new Promise((r) => setTimeout(r, 600));
  const inject = `(async () => {
    const bytes = Uint8Array.from(atob('${font}'), (c) => c.charCodeAt(0));
    const face = new FontFace('B', bytes, { weight: '800' });
    document.fonts.add(await face.load());
    await document.fonts.ready;
    return face.status;
  })()`;
  const loaded = await send('Runtime.evaluate', { expression: inject, awaitPromise: true, returnByValue: true });
  if (loaded.result.result.value !== 'loaded') throw new Error('Icon font failed to load');
  await new Promise((r) => setTimeout(r, 100));
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: t.size, height: t.size, scale: 1 } });
  writeFileSync(join(out, t.file), Buffer.from(shot.result.data, 'base64'));
  console.log('wrote', t.file);
}
} finally {
  ws.close();
  proc.kill();
}
