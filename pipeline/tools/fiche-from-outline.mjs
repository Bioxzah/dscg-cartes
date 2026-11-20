// Builds a fiche in the kit's HTML template from a short outline (pipeline/outlines/*.txt), for fiches made
// outside the pipeline (UE 4, rebuilt from their PDF). Usage: node tools/fiche-from-outline.mjs outline.txt ../fiches/ue1-ch01.html out.html
import fs from 'node:fs';
const [, , outlineFile, templateFile, outFile] = process.argv;
const tpl = fs.readFileSync(templateFile, 'utf8');
const head = tpl.slice(0, tpl.indexOf('<div class="wrap">'));
const tail = tpl.slice(tpl.indexOf('<button id="toggle"'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const il = (s) => esc(s.trim()).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const meta = { zones: 'Règle|le principe;Dans l\'énoncé|à chercher;Résultat|la réponse' };
const out = [];
let block = null; // current open block
const sections = [];
let section = null;
const close = () => {
  if (!block) return;
  section.parts.push(render(block));
  block = null;
};
function foot(items) {
  if (!items.length) return '';
  return `<div class="foot">${items.map(([kind, tag, text]) => `<p class="${kind}"><span class="tag">${esc(tag)}</span>${il(text)}</p>`).join('')}</div>`;
}
function render(b) {
  const z = (b.zones ?? meta.zones).split(';').map((x) => x.split('|'));
  if (b.type === 'card') {
    const zone = (i, cls, body) => `<div class="zone${cls}"><h4><b>${esc(z[i][0])}</b> ${esc(z[i][1])}</h4><div class="zbody">${body}</div></div>`;
    const paras = (l) => l.map((t) => (t.startsWith('- ') ? null : `<p>${il(t)}</p>`));
    const body = (l) => {
      let html = '', list = [];
      const flush = () => { if (list.length) html += `<ul>${list.map((x) => `<li>${il(x)}</li>`).join('')}</ul>`; list = []; };
      for (const t of l) { if (t.startsWith('- ')) list.push(t.slice(2)); else { flush(); html += `<p>${il(t)}</p>`; } }
      flush();
      return html;
    };
    void paras;
    return `<article class="card">
    <header><h3>${il(b.title)}</h3>${b.core ? '<span class="core">Par cœur</span>' : ''}</header>
    ${b.q ? `<p class="q">${il(b.q)}</p>` : ''}
    <div class="syl">
      ${zone(0, ' maj hideable', body(b.z1))}
      ${zone(1, '', `<ul class="check">${b.z2.map((x) => `<li>${il(x)}</li>`).join('')}</ul>`)}
      ${zone(2, ' hideable', body(b.z3))}
    </div>
    ${foot(b.foot)}
  </article>`;
  }
  if (b.type === 'table') {
    return `<div class="tw"><table>
    ${b.caption ? `<caption>${il(b.caption)}</caption>` : ''}
    <thead><tr>${b.head.map((h) => `<th>${il(h)}</th>`).join('')}</tr></thead>
    <tbody>
${b.rows.map((r) => `      <tr><th>${il(r[0])}</th>${r.slice(1).map((c) => `<td>${il(c)}</td>`).join('')}</tr>`).join('\n')}
    </tbody>
  </table></div>${b.foot.length ? `\n  <div class="card">${foot(b.foot)}</div>` : ''}`;
  }
  if (b.type === 'tiles') {
    return `<div class="tiles${b.tiles.length === 2 || b.tiles.length === 4 ? ' two' : ''}">
${b.tiles.map((t) => `    <div class="tile"><h3>${il(t.title)}</h3>${t.lines.map((l) => (l.startsWith('graph:') ? graph(l.slice(6)) : l.startsWith('- ') ? `<ul><li>${il(l.slice(2))}</li></ul>` : l.startsWith('Ex. ') ? `<p class="eg"><b>Ex.</b> ${il(l.slice(4))}</p>` : `<p>${il(l)}</p>`)).join('').replace(/<\/ul><ul>/g, '')}</div>`).join('\n')}
  </div>${b.foot.length ? `\n  <div class="card">${foot(b.foot)}</div>` : ''}`;
  }
  if (b.type === 'box') {
    let html = '', list = [];
    const flush = () => { if (list.length) html += `<ul class="blist">${list.map((x) => `<li>${il(x)}</li>`).join('')}</ul>`; list = []; };
    for (const t of b.lines) { if (t.startsWith('- ')) list.push(t.slice(2)); else { flush(); html += `<p>${il(t)}</p>`; } }
    flush();
    usesBox = true;
    return `<article class="card box">
    <header><h3>${il(b.title)}</h3>${b.core ? '<span class="core">Par cœur</span>' : ''}</header>
    ${b.q ? `<p class="q">${il(b.q)}</p>` : ''}
    <div class="bbody">${html}</div>
    ${foot(b.foot)}
  </article>`;
  }
  if (b.type === 'compare') {
    usesCompare = true;
    const cell = (txt, col) => {
      const [head, ...items] = txt.split(' ;; ').map((x) => x.trim());
      return `<div class="ccell"><p class="ccol">${esc(col)}</p><p class="chead">${il(head)}</p>${items.length ? `<ul class="cchecks">${items.map((x) => `<li>${il(x)}</li>`).join('')}</ul>` : ''}</div>`;
    };
    return `<figure class="compare">
    <figcaption>${il(b.caption)}</figcaption>
    <div class="cgrid">
      <div class="ccorner"></div>${b.cols.map((c) => `<div class="ctop">${il(c)}</div>`).join('')}
${b.rows.map((r) => `      <div class="crow">${il(r[0])}</div>${r.slice(1).map((x, i) => cell(x, b.cols[i])).join('')}`).join('\n')}
    </div>
  </figure>${b.foot.length ? `\n  <div class="card">${foot(b.foot)}</div>` : ''}`;
  }
  if (b.type === 'flow') {
    usesFlow = true;
    const step = (st) => `<div class="frow">
      <div class="fstep"><p class="fn">${esc(st.n)}</p><p class="fq">${il(st.q)}</p>${st.facts.length ? `<ul class="ffacts">${st.facts.map((f) => `<li>${il(f)}</li>`).join('')}</ul>` : ''}${st.src ? `<p class="fsrc">${il(st.src)}</p>` : ''}</div>
      <div class="fouts">${st.outs.map((o) => `<div class="fout ${o.cls}"><span class="fchip">${esc(o.chip)}</span><p>${il(o.text)}</p></div>`).join('')}</div>
    </div>${st.next ? `\n    <div class="fnext"><div><span class="fchip">${esc(st.next)}</span></div></div>` : ''}`;
    return `<figure class="flow">
    <figcaption>${il(b.caption)}</figcaption>
    ${b.steps.map(step).join('\n    ')}
    ${b.notes.map((n) => `<p class="fnote">${il(n)}</p>`).join('')}
  </figure>${b.foot.length ? `\n  <div class="card">${foot(b.foot)}</div>` : ''}`;
  }
  if (b.type === 'foot') return `<div class="card">${foot(b.foot)}</div>`;
  throw new Error(b.type);
}
// A small diagram of shareholdings: "graph: M@0,0 A@1,0 | M>A 70 % | A>M 5 %".
// Nodes sit on a grid; an arrow goes from the holder to the company held, with an optional label.
// Two opposite arrows between the same nodes are curved so both stay visible.
let usesGraph = false;
function graph(spec) {
  usesGraph = true;
  const [nodeSpec, ...edgeSpecs] = spec.split('|').map((s) => s.trim());
  const X = 112, Y = 84, P = 34, R = 21;
  const nodes = new Map(nodeSpec.split(/\s+/).map((n) => { const [name, xy] = n.split('@'); const [x, y] = xy.split(',').map(Number); return [name, { x: P + x * X, y: P + y * Y }]; }));
  const edges = edgeSpecs.map((e) => { const m = e.match(/^(\S+)>(\S+)\s*(.*)$/); return { from: m[1], to: m[2], label: m[3] }; });
  const w = Math.max(...[...nodes.values()].map((n) => n.x)) + P, h = Math.max(...[...nodes.values()].map((n) => n.y)) + P;
  const f = (n) => n.toFixed(1);
  const parts = edges.map(({ from, to, label }) => {
    const a = nodes.get(from), b = nodes.get(to);
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const bend = edges.some((e) => e.from === to && e.to === from) ? 24 : 0;
    const cx = (a.x + b.x) / 2 + uy * bend, cy = (a.y + b.y) / 2 - ux * bend; // control point, left of the arrow
    const dir = (px, py, qx, qy) => { const l = Math.hypot(qx - px, qy - py); return [(qx - px) / l, (qy - py) / l]; };
    const [sx, sy] = dir(a.x, a.y, cx, cy), [ex, ey] = dir(cx, cy, b.x, b.y);
    const s = [a.x + sx * R, a.y + sy * R], t = [b.x - ex * (R + 2), b.y - ey * (R + 2)];
    const tip = [b.x - ex * R, b.y - ey * R], base = [tip[0] - ex * 9, tip[1] - ey * 9];
    const head = `${f(tip[0])},${f(tip[1])} ${f(base[0] - ey * 4.5)},${f(base[1] + ex * 4.5)} ${f(base[0] + ey * 4.5)},${f(base[1] - ex * 4.5)}`;
    const mx = (s[0] + 2 * cx + t[0]) / 4, my = (s[1] + 2 * cy + t[1]) / 4; // middle of the curve
    const off = (bend ? 12 : 11) + 14 * Math.abs(uy), lx = mx + uy * off, ly = my - ux * off + 4;
    return `<path d="M${f(s[0])} ${f(s[1])} Q${f(cx)} ${f(cy)} ${f(t[0])} ${f(t[1])}"/><polygon points="${head}"/>${label ? `<text class="lb" x="${f(lx)}" y="${f(ly)}">${esc(label)}</text>` : ''}`;
  });
  const circles = [...nodes].map(([name, n], i) => `<circle class="${i === 0 ? 'mother' : ''}" cx="${n.x}" cy="${n.y}" r="${R}"/><text x="${n.x}" y="${n.y + 5}">${esc(name)}</text>`);
  return `<svg class="graph" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(edges.map((e) => `${e.from} détient ${e.to}${e.label ? ' à ' + e.label : ''}`).join(', '))}">${parts.join('')}${circles.join('')}</svg>`;
}
const GRAPH_CSS = `<style>
.graph{display:block;max-width:100%;height:auto;margin:6px auto 2px;overflow:visible}
.graph path{fill:none;stroke:var(--h);stroke-width:2}
.graph polygon{fill:var(--h)}
.graph circle{fill:var(--surface);stroke:var(--h);stroke-width:2}
.graph circle.mother{fill:var(--hs)}
.graph text{font-family:var(--display);font-weight:600;font-size:16px;text-anchor:middle;fill:var(--ink)}
.graph text.lb{font-family:var(--mono);font-weight:500;font-size:12px;fill:var(--muted)}
</style>
`;
// A decision flow: questions down the left, outcomes on the right; one column on a phone.
let usesFlow = false;
let usesBox = false;
let usesCompare = false;
const COMPARE_CSS = `<style>
.compare{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px}
.compare figcaption{font-family:var(--display);font-weight:600;font-size:19px;margin-bottom:14px}
.cgrid{display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1fr) minmax(0,1fr);gap:10px}
.ctop{font-family:var(--mono);font-weight:500;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--h);padding:0 4px;align-self:end}
.crow{font-family:var(--display);font-weight:600;font-size:16px;line-height:1.3;color:var(--h);padding:12px 12px;border-left:4px solid var(--h);background:var(--hs);border-radius:0 10px 10px 0}
.ccell{border:1.5px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.ccol{display:none}
.chead{font-weight:700;font-size:16.5px}
.cchecks{display:flex;flex-direction:column;gap:4px;font-size:15px}
.cchecks li{padding-left:24px;position:relative}
.cchecks li::before{content:"";position:absolute;left:2px;top:.35em;width:13px;height:13px;border:1.5px solid var(--h);border-radius:3px}
.cchecks li::after{content:"";position:absolute;left:6px;top:calc(.35em + 2px);width:4px;height:7px;border:solid var(--h);border-width:0 2px 2px 0;transform:rotate(45deg)}
@media (max-width:640px){
  .cgrid{grid-template-columns:1fr}
  .ccorner,.ctop{display:none}
  .crow{margin-top:8px}
  .ccol{display:block;font-family:var(--mono);font-weight:500;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
}
@media print{.compare{break-inside:avoid}}
</style>
`;
const BOX_CSS = `<style>
.box .bbody{padding:4px 18px 16px;display:flex;flex-direction:column;gap:8px}
.box .blist{list-style:disc;padding-left:1.2em;display:flex;flex-direction:column;gap:4px}
.box .blist li::marker{color:var(--h)}
.zbody ul:not(.check){list-style:disc;padding-left:1.2em;display:flex;flex-direction:column;gap:4px;margin-top:4px}
.zbody ul:not(.check) li::marker{color:var(--h)}
.tile ul{list-style:disc;padding-left:1.2em;display:flex;flex-direction:column;gap:3px;font-size:15px}
.tile ul li::marker{color:var(--h)}
.tile ul+p{margin-top:8px}
</style>
`;
const FLOW_CSS = `<style>
.flow{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px}
.flow figcaption{font-family:var(--display);font-weight:600;font-size:19px;margin-bottom:14px}
.frow,.fnext{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);column-gap:44px}
.frow{align-items:stretch}
.fstep{border:2px solid var(--h);border-radius:10px;overflow:hidden;background:var(--surface)}
.fn{background:var(--h);color:var(--surface);font-family:var(--mono);font-weight:500;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase;padding:6px 12px}
.fq{padding:10px 12px 4px;font-weight:700}
.ffacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:8px 12px 6px}
.ffacts li{background:var(--hs);border-radius:8px;padding:8px 10px;font-size:14px;line-height:1.3;text-align:center}
.ffacts li b{display:block;font-size:19px;color:var(--h);font-family:var(--display)}
.fsrc{padding:0 12px 10px;font-size:13.5px;color:var(--muted);font-style:italic}
.fouts{display:flex;flex-direction:column;justify-content:center;gap:10px}
.fout{position:relative;border-radius:10px;padding:10px 12px;display:flex;gap:10px;align-items:baseline;border:1.5px solid currentColor}
.fout::before{content:"";position:absolute;right:100%;top:50%;width:44px;height:2px;margin-top:-1px;background:currentColor}
.fout::after{content:"";position:absolute;right:100%;top:50%;margin-top:-6px;border-left:9px solid currentColor;border-block:6px solid transparent}
.fout p{color:var(--ink);font-size:15.5px}
.fout.nul{background:var(--nuls);color:var(--nul)} .fout.exe{background:var(--exes);color:var(--exe)} .fout.blue{background:var(--s2s);color:var(--s2)}
.fchip{font-family:var(--mono);font-weight:500;font-size:12px;border:1.5px solid currentColor;border-radius:6px;padding:1px 6px;white-space:nowrap;background:var(--surface)}
.fnext>div{display:flex;flex-direction:column;align-items:center;padding-top:14px;color:var(--h);background:linear-gradient(currentColor,currentColor) center top/2px calc(100% - 8px) no-repeat}
.fnext>div::after{content:"";margin-top:6px;border-top:9px solid currentColor;border-inline:6px solid transparent}
.fnote{margin-top:16px;background:var(--wash);border-radius:10px;padding:10px 12px;font-size:15px}
@media (max-width:640px){
  .frow,.fnext{grid-template-columns:1fr}
  .fouts{margin-top:20px}
  .fout::before,.fout::after{display:none}
  .fout:first-child::before{display:block;right:auto;left:31px;top:auto;bottom:100%;width:2px;height:20px;margin:0 0 1px}
  .fout:first-child::after{display:block;right:auto;left:26px;top:auto;bottom:100%;margin:0;border:0;border-top:9px solid currentColor;border-inline:6px solid transparent}
}
@media print{.flow{break-inside:avoid}}
</style>
`;
const FOOT = { ex: ['ex', 'Exemple'], fil: ['ex', 'Fil rouge'], trap: ['trap', 'Piège'], memo: ['memo', 'Mémo'] };
for (const raw of fs.readFileSync(outlineFile, 'utf8').split('\n')) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  let m;
  if ((m = line.match(/^@(\w+)\s+(.*)$/))) { meta[m[1]] = m[2]; continue; }
  if (line.startsWith('== ')) {
    close();
    const [n, t, id, title] = line.slice(3).split('|').map((s) => s.trim());
    section = { n, t, id, title, parts: [] };
    sections.push(section);
    continue;
  }
  if (line.startsWith('-- ')) {
    close();
    const [type, ...rest] = line.slice(3).split('|').map((s) => s.trim());
    if (type === 'card') block = { type, title: rest[0], q: rest[1], core: rest[2] === '*', z1: [], z2: [], z3: [], foot: [] };
    else if (type === 'table') block = { type, caption: rest[0], head: rest.slice(1), rows: [], foot: [] };
    else if (type === 'tiles') block = { type, tiles: [], foot: [] };
    else if (type === 'foot') block = { type, foot: [] };
    else if (type === 'compare') block = { type, caption: rest[0], cols: rest.slice(1), rows: [], foot: [] };
    else if (type === 'box') block = { type, title: rest[0], q: rest[1], core: rest[2] === '*', lines: [], foot: [] };
    else if (type === 'flow') block = { type, caption: rest[0], steps: [], notes: [], foot: [] };
    else throw new Error('type ' + type);
    continue;
  }
  if ((m = line.match(/^(ex|fil|trap|memo)(?:\[([^\]]+)\])?:\s*(.*)$/))) { const [kind, tag] = FOOT[m[1]]; block.foot.push([kind, m[2] ?? tag, m[3]]); continue; }
  if ((m = line.match(/^([123]):\s*(.*)$/))) { block['z' + m[1]].push(m[2]); continue; }
  if (line.startsWith('| ')) { block.rows.push(line.slice(2).split('|').map((s) => s.trim())); continue; }
  if ((m = line.match(/^tile:\s*(.*)$/))) { block.tiles.push({ title: m[1], lines: [] }); continue; }
  if (block?.type === 'compare' && (m = line.match(/^row:\s*(.*)$/))) { block.rows.push(m[1].split(' | ').map((x) => x.trim())); continue; }
  if (block?.type === 'card' && (m = line.match(/^zones:\s*(.*)$/))) { block.zones = m[1]; continue; }
  if (block?.type === 'box' && (m = line.match(/^txt:\s*(.*)$/))) { block.lines.push(m[1]); continue; }
  if (block?.type === 'flow' && (m = line.match(/^(step|out|next|note|fact):\s*(.*)$/))) {
    const f = m[2].split('|').map((x) => x.trim());
    if (m[1] === 'step') block.steps.push({ n: f[0], q: f[1], src: f[2], outs: [], facts: [] });
    else if (m[1] === 'fact') block.steps.at(-1).facts.push(m[2]);
    else if (m[1] === 'out') block.steps.at(-1).outs.push({ cls: f[0], chip: f[1], text: f.slice(2).join('|') });
    else if (m[1] === 'next') block.steps.at(-1).next = m[2];
    else block.notes.push(m[2]);
    continue;
  }
  if (block?.type === 'tiles' && block.tiles.length) { block.tiles.at(-1).lines.push(line); continue; }
  throw new Error('ligne non comprise : ' + line);
}
close();
const html = `${head.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)}${usesGraph ? GRAPH_CSS : ''}${usesFlow ? FLOW_CSS : ''}${BOX_CSS}${usesCompare ? COMPARE_CSS : ''}<div class="wrap">

<header class="top">
  <p class="eyebrow">${esc(meta.eyebrow)}</p>
  <h1>${esc(meta.title)}</h1>
  <p class="lede">${il(meta.lede)}</p>
</header>

${sections.map((s) => `<section class="stage ${s.t}" id="${s.id}">
  <h2><span class="n">${s.n}</span>${il(s.title)}</h2>
  ${s.parts.join('\n\n  ')}
</section>`).join('\n\n')}

<footer>
  <p>${il(meta.footer ?? '')}</p>
</footer>

</div>

${tail}`;
fs.writeFileSync(outFile, html);
console.log(outFile, sections.length, 'sections');
