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
  const z = meta.zones.split(';').map((x) => x.split('|'));
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
    return `<div class="tiles${b.tiles.length === 2 ? ' two' : ''}">
${b.tiles.map((t) => `    <div class="tile"><h3>${il(t.title)}</h3>${t.lines.map((l) => (l.startsWith('- ') ? `<ul><li>${il(l.slice(2))}</li></ul>` : l.startsWith('Ex. ') ? `<p class="eg"><b>Ex.</b> ${il(l.slice(4))}</p>` : `<p>${il(l)}</p>`)).join('').replace(/<\/ul><ul>/g, '')}</div>`).join('\n')}
  </div>${b.foot.length ? `\n  <div class="card">${foot(b.foot)}</div>` : ''}`;
  }
  if (b.type === 'foot') return `<div class="card">${foot(b.foot)}</div>`;
  throw new Error(b.type);
}
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
    else throw new Error('type ' + type);
    continue;
  }
  if ((m = line.match(/^(ex|fil|trap|memo)(?:\[([^\]]+)\])?:\s*(.*)$/))) { const [kind, tag] = FOOT[m[1]]; block.foot.push([kind, m[2] ?? tag, m[3]]); continue; }
  if ((m = line.match(/^([123]):\s*(.*)$/))) { block['z' + m[1]].push(m[2]); continue; }
  if (line.startsWith('| ')) { block.rows.push(line.slice(2).split('|').map((s) => s.trim())); continue; }
  if ((m = line.match(/^tile:\s*(.*)$/))) { block.tiles.push({ title: m[1], lines: [] }); continue; }
  if (block?.type === 'tiles' && block.tiles.length) { block.tiles.at(-1).lines.push(line); continue; }
  throw new Error('ligne non comprise : ' + line);
}
close();
const html = `${head.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)}<div class="wrap">

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
