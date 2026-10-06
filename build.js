// Gera o site estático dos ambientes Bartzen + Casa Contente na Casa Liv 2026 + QR codes.
// Uso: node build.js  → site em dist/ (um ambiente por pasta), material de impressão em qrcodes/
// Dados: site.json (comum) + ambientes/<ambiente>.json (um arquivo por ambiente)
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const AMBIENTES = fs.readdirSync(path.join(ROOT, 'ambientes')).filter(f => f.endsWith('.json')).sort()
  .map(f => JSON.parse(fs.readFileSync(path.join(ROOT, 'ambientes', f), 'utf8')))
  .map(a => ({ C: { ...SITE, ...a.config }, P: a.produtos }))
  .sort((a, b) => (a.C.ordem ?? 99) - (b.C.ordem ?? 99));
// Ambiente que está sendo gerado (as funções de página leem estas variáveis)
let C, P, PRO;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const arr = v => (Array.isArray(v) ? v : v ? [v] : []);
const up = d => '../'.repeat(d);
// Cada ambiente é publicado como uma pasta independente (dist/<slug>/), com CSS e imagens próprios
const R = d => '../'.repeat(d);
const img = (f, d) => (/^https?:/.test(f) ? f : `${R(d)}imagens/${f}`);
const ambUrl = c => `${SITE.baseUrl.replace(/\/$/, '')}/${c.slug}/`;
const imgObj = i => (typeof i === 'string' ? { src: i } : i);
const productUrl = p => `${ambUrl(C)}produtos/${p.slug}/`;
const qrUrl = p => `${productUrl(p)}?qr`; // "?qr" separa no analytics os acessos vindos do QR
// Planejados vão para o WhatsApp da Bartzen; as demais peças, para o da Casa Contente
const isBartzen = p => /bartzen/i.test(p?.grupo || '');
const waNumero = marca => (marca === 'bartzen' ? C.whatsappBartzen : marca === 'casacontente' ? C.whatsappCasaContente : null) || C.whatsapp;
const waLink = (p, marca) => `https://wa.me/${waNumero(marca || (p ? (isBartzen(p) ? 'bartzen' : 'casacontente') : null))}?text=${encodeURIComponent(
  p ? `Olá! Vi o produto ${p.nome} (${p.codigo}) no ${C.ambiente}, na ${C.evento}, e gostaria de mais informações.`
    : marca === 'bartzen' ? `Olá! Visitei o ${C.ambiente} na ${C.evento} e gostaria de falar sobre um projeto de móveis planejados Bartzen.`
    : `Olá! Visitei o ${C.ambiente} na ${C.evento} e gostaria de mais informações.`)}`;

// Contatos da Bartzen vão para o site de solicitação de projeto (cai no kanban da equipe);
// "origem" identifica de qual ambiente/peça veio o pedido.
const projetoUrl = p => `${C.bartzenProjetoUrl}?origem=${encodeURIComponent(`casaliv-${C.slug}${p ? '-' + p.codigo : ''}`)}`;
const ctaHref = p => (isBartzen(p) && C.bartzenProjetoUrl ? projetoUrl(p) : waLink(p));
const ctaIcon = p => (isBartzen(p) && C.bartzenProjetoUrl ? ARROW_ICON : WA_ICON);
const ARROW_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12.2l-4.6-4.6L14 6l7 7-7 7-1.4-1.4 4.6-4.6H5z"/></svg>';
// Assinatura das marcas, sempre na ordem Bartzen + Casa Contente ("claro" = para fundo claro)
const duoLogos = (base, claro = false) => `<span class="duo"><img class="duo-bz" src="${base}logo-bartzen${claro ? '' : '-branco'}.svg" alt="Bartzen"><b>+</b><img class="duo-cc" src="${base}logo-casacontente${claro ? '' : '-branco'}.svg" alt="Casa Contente"></span>`;
const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.8.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm0-21.6A11.8 11.8 0 0 0 1.9 18l-1.7 6 6.2-1.6A11.8 11.8 0 1 0 12 .2z"/></svg>';
const IG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>';

const head = (title, desc, d, ogImg) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${ogImg ? `<meta property="og:image" content="${esc(ambUrl(C))}imagens/${esc(ogImg)}">` : ''}
<meta name="theme-color" content="#000000">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Source+Serif+4:ital,wght@1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${R(d)}assets/style.css">
${C?.tema ? `<style>:root{${Object.entries(C.tema).map(([k, v]) => `${k}:${v}`).join(';')}}</style>` : ''}
</head>`;

const chrome = (d, active) => `
<div class="topbar"><div class="wrap"><a href="${R(d)}index.html"><b>CASA LIV</b> · experiência viva · ${esc(C.local)}</a><span>${esc(C.ambiente)} · por ${esc(PRO.nome)}</span></div></div>
<header class="header"><div class="wrap">
  <a class="logo" href="${up(d)}index.html" aria-label="Casa Contente — ${esc(C.ambiente)} na ${esc(C.evento)}"><img class="logo-cc" src="${img(C.logoTopo || C.logo, d)}" alt="Casa Contente">${C.logoCasaLiv ? `<i class="sep"></i><img class="logo-liv" src="${img(C.logoCasaLiv, d)}" alt="Casa Liv 2026 · experiência viva">` : ''}</a>
  <nav>
    <a href="${up(d)}index.html#conceito" class="${active === 'amb' ? 'on' : ''}">O Ambiente</a>
    <a href="${up(d)}index.html#arquiteta">A Arquiteta</a>
    <a href="${up(d)}index.html#produtos" class="${active === 'prod' ? 'on' : ''}">Produtos</a>
    <a href="${up(d)}index.html#marcas">Marcas</a>
    <a href="${waLink(null, 'casacontente')}" target="_blank" rel="noopener">Contato</a>
  </nav>
</div></header>`;

const footer = d => `
<footer><div class="wrap">
  <span><b>${esc(C.evento)}</b> · ${esc(C.ambiente)} por ${esc(PRO.nome)} · ${esc(C.local)}</span>
  <span class="dev">Desenvolvido por <img src="${img('logo-contente-mais-branco.svg', d)}" alt="Contente+"></span>
</div></footer>`;

const revealScript = `<script>
(() => {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .1 });
  els.forEach(e => io.observe(e));
})();
</script>`;

const card = (p, d) => {
  const first = p.imagens?.length ? imgObj(p.capa ?? p.imagens[0]) : null;
  return `
<a class="card reveal" href="${up(d)}produtos/${p.slug}/index.html" data-grupo="${esc(p.grupo)}">
  <div class="thumb">${first ? `<img src="${esc(img(first.src, d))}" alt="${esc(p.nome)}" loading="lazy"${first.contain ? ' class="contain"' : ''}>` : '<div class="ph">Foto em breve</div>'}</div>
  <div class="info">
    <span class="code">${esc(p.codigo)}</span>
    <h3>${esc(p.nome)}</h3>
    <span class="brand">${esc(p.grupo === 'Planejados Bartzen' ? p.fabricante : 'Casa Contente')}</span>
  </div>
</a>`;
};

// ---------- Página do ambiente ----------
function pageIndex() {
  const grupos = C.grupos.filter(g => P.some(p => p.grupo === g));
  const bz = C.marcas.bartzen, cc = C.marcas.casacontente;
  return `${head(`${C.ambiente} por ${PRO.nome} · ${C.evento}`, `Casa Contente e Bartzen apresentam ${C.ambiente}, ${C.subtitulo.toLowerCase()}, na ${C.evento} em ${C.local}.`, 0, C.imagemCapa)}
<body>
${chrome(0, 'amb')}
<section class="hero">
  <div class="bg" style="background-image:url('${esc(img(C.imagemCapa, 0))}')"></div>
  ${C.recorteCapa ? `<span class="glow"></span><img class="cutout" src="${esc(img(C.recorteCapa, 0))}" alt="${esc(PRO.nome)}, arquiteta do ${esc(C.ambiente)}">` : ''}
  <div class="wrap">
    <span class="eyebrow">Mostra de arquitetura ${esc(C.evento)} <i></i> ${esc(C.local)}</span>
    <p class="presents">${duoLogos(R(0) + 'imagens/')} apresentam</p>
    <h1${C.ambiente.length > 14 ? ' class="long"' : ''}>${esc(C.ambiente).replace(' ', '<br>')}</h1>
    <p class="by">${PRO.escritorio && C.subtitulo.includes(PRO.escritorio) ? `${esc(C.subtitulo.replace(PRO.escritorio, ''))}<b>${esc(PRO.escritorio)}</b> · ${esc(PRO.nome)}` : `${esc(C.subtitulo)} <b>${esc(PRO.nome)}</b>`}</p>
    <div class="meta">${arr(C.destaques).map(t => `<span>${esc(t)}</span>`).join('')}</div>
  </div>
</section>

<section class="block" id="conceito"><div class="wrap split">
  <div class="reveal">
    <span class="eyebrow">O conceito</span>
    <div class="concept" style="margin-top:22px">
      <p class="quote">${esc(C.conceito.frase)}</p>
      ${arr(C.conceito.texto).map(t => `<p class="lead">${esc(t)}</p>`).join('\n      ')}
    </div>
  </div>
  ${C.planta ? `<figure class="plan reveal"><img src="${img(C.planta, 0)}" alt="Planta humanizada do ${esc(C.ambiente)}" loading="lazy"><figcaption>${esc(C.ambiente)} · layout humanizado</figcaption></figure>` : ''}
</div></section>

${C.borogodo ? `<section class="block dark">
  <span class="arc" style="width:520px;height:520px;right:-180px;top:-220px"></span>
  <span class="arc" style="width:300px;height:300px;left:-120px;bottom:-160px"></span>
  <div class="wrap"><div class="narrow reveal">
    <span class="eyebrow">${esc(C.borogodo.eyebrow)}</span>
    <h2>${C.borogodo.titulo}</h2>
    <p class="quote" style="margin-bottom:22px">${esc(C.borogodo.frase)}</p>
    ${arr(C.borogodo.texto).map(t => `<p class="lead">${esc(t)}</p>`).join('\n    ')}
  </div></div>
</section>` : ''}

${C.galeria?.length ? `<section class="block"><div class="wrap">
  <div class="reveal"><span class="eyebrow">O ambiente</span><h2>${C.galeriaTitulo || `Um passeio pelo <b>${esc(C.ambiente)}</b>`}</h2></div>
  <div class="mosaic">${C.galeria.map((g, k) => `<figure class="reveal${k === 0 ? ' big' : ''}"><img src="${esc(img(imgObj(g).src, 0))}" alt="${esc(C.ambiente)} — vista ${k + 1}" loading="lazy"></figure>`).join('')}</div>
</div></section>` : ''}

${C.programa?.length ? `<section class="block"><div class="wrap">
  <div class="reveal"><span class="eyebrow">Programa</span><h2>${C.programaTitulo}</h2></div>
  <div class="program">
    ${C.programa.map(x => `<figure class="reveal"><img src="${esc(img(x.imagem, 0))}" alt="${esc(x.titulo)}" loading="lazy"><figcaption><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></figcaption></figure>`).join('\n    ')}
  </div>
</div></section>` : ''}

${C.paleta?.length ? `<section class="block" style="padding-top:0"><div class="wrap">
  <div class="reveal"><span class="eyebrow">Materialidade &amp; paleta</span><h2>${C.paletaTitulo}</h2>
  <p class="lead">${esc(C.paletaTexto)}</p></div>
  <div class="palette">
    ${C.paleta.map(c => `<div class="swatch reveal"><i style="background:${esc(c.cor)}"></i><b>${esc(c.nome)}</b><small>${esc(c.uso)}</small></div>`).join('\n    ')}
  </div>
</div></section>` : ''}

${C.iluminacao?.length ? `<section class="block dark">
  <span class="arc" style="width:420px;height:420px;right:-160px;bottom:-200px"></span>
  <div class="wrap">
    <div class="reveal"><span class="eyebrow">${esc(C.iluminacaoEyebrow || 'Iluminação & tecnologia')}</span><h2>${C.iluminacaoTitulo}</h2></div>
    <ol class="lights">
      ${C.iluminacao.map(l => `<li class="reveal"><div><b>${esc(l.titulo)}</b>${esc(l.texto)}</div></li>`).join('\n      ')}
    </ol>
  </div>
</section>` : ''}

<section class="block" id="arquiteta"><div class="wrap architect">
  <div class="photos reveal">
    ${[0, 1, 2].map(k => PRO.fotos?.[k]
      ? `<figure><img src="${esc(img(imgObj(PRO.fotos[k]).src, 0))}" alt="${esc(PRO.nome)}" loading="lazy" style="object-position:${esc(imgObj(PRO.fotos[k]).pos || '50% 30%')}"></figure>`
      : `<div class="slot">Foto da arquiteta<br>${k + 1}</div>`).join('\n    ')}
  </div>
  <div class="reveal">
    <span class="eyebrow">Quem assina</span>
    ${PRO.logo ? `<img class="pro-logo" src="${img(PRO.logo, 0)}" alt="${esc(PRO.nome)}">` : ''}
    ${PRO.logo ? '' : `<h2><b>${esc(PRO.nome)}</b></h2>
    <p class="role">${[PRO.escritorio, PRO.cargo].filter(Boolean).map(esc).join(' · ')}</p>`}
    ${PRO.frase ? `<p class="quote">${esc(PRO.frase)}</p>` : ''}
    ${arr(PRO.bio).map(t => `<p class="lead">${esc(t)}</p>`).join('\n    ')}
    ${PRO.instagram ? `<a class="ig" href="https://instagram.com/${esc(PRO.instagram)}" target="_blank" rel="noopener">${IG_ICON} @${esc(PRO.instagram)}</a>` : ''}
  </div>
</div></section>

<section class="block" id="produtos" style="padding-top:0"><div class="wrap">
  <div class="products-head">
    <div><span class="eyebrow">No ambiente</span><h2>Os <b>produtos</b></h2></div>
    <div class="filters" role="group" aria-label="Filtrar produtos">
      <button class="on" data-f="*">Todos</button>
      ${grupos.map(g => `<button data-f="${esc(g)}">${esc(g)}</button>`).join('\n      ')}
    </div>
  </div>
  <div class="grid">${P.map(p => card(p, 0)).join('')}</div>
</div></section>

<section class="block dark" id="marcas">
  <span class="arc" style="width:560px;height:560px;left:-260px;top:-240px"></span>
  <div class="wrap" style="position:relative">
    <div class="reveal"><span class="eyebrow">Quem apresenta</span><h2>Bartzen <b>+</b> Casa Contente</h2></div>
    <div class="brands-grid">
      <div class="reveal">
        <h3 class="brand-title"><img class="bt-bz" src="${R(0)}imagens/logo-bartzen-branco.svg" alt="${esc(bz.titulo)}"></h3>
        ${arr(bz.historia).map(t => `<p>${esc(t)}</p>`).join('\n        ')}
        ${bz.fatos?.length ? `<ul class="facts">${bz.fatos.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        <a class="btn brand-cta" href="${C.bartzenProjetoUrl ? projetoUrl() : waLink(null, 'bartzen')}" target="_blank" rel="noopener">${C.bartzenProjetoUrl ? ARROW_ICON : WA_ICON} Solicite seu projeto Bartzen</a>
      </div>
      <div class="reveal">
        <h3 class="brand-title"><img class="bt-cc" src="${R(0)}imagens/logo-casacontente-branco.svg" alt="${esc(cc.titulo)}"></h3>
        ${arr(cc.texto).map(t => `<p>${esc(t)}</p>`).join('\n        ')}
        ${cc.fatos?.length ? `<ul class="facts">${cc.fatos.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        <a class="btn brand-cta" href="${waLink(null, 'casacontente')}" target="_blank" rel="noopener">${WA_ICON} Fale com a Casa Contente</a>
      </div>
    </div>
  </div>
</section>
${footer(0)}
<script>
document.querySelectorAll('.filters button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.filters button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.grid .card').forEach(c => { c.hidden = b.dataset.f !== '*' && c.dataset.grupo !== b.dataset.f; c.classList.add('in'); });
}));
</script>
${revealScript}
</body>
</html>`;
}

// ---------- Página de produto ----------
function pageProduto(p, i) {
  const d = 2;
  const imgs = (p.imagens?.length ? p.imagens : [null]).map(x => x && imgObj(x));
  const outros = [...P.slice(i + 1), ...P.slice(0, i)].filter(o => o.grupo === p.grupo).concat([...P.slice(i + 1), ...P.slice(0, i)].filter(o => o.grupo !== p.grupo)).slice(0, 4);
  const detalhes = Object.entries(p.detalhes || {});
  const first = imgs[0];
  return `${head(`${p.nome} · ${C.ambiente} · ${C.evento}`, `${p.nome} (${p.fabricante}) no ${C.ambiente}, por ${PRO.nome}, na ${C.evento}.`, d, first?.src)}
<body class="has-sticky">
${chrome(d, 'prod')}
<main class="wrap">
  <div class="crumb"><a href="../../index.html">${esc(C.ambiente)}</a> / <a href="../../index.html#produtos">Produtos</a> / <span>${esc(p.nome)}</span></div>
  <article class="product">
    <div>
      <div class="gallery" id="gal">${imgs.map((f, k) => f
        ? `<figure><img src="${esc(img(f.src, d))}" alt="${esc(p.nome)} — foto ${k + 1}"${f.contain ? ' class="contain"' : ''}${k ? ' loading="lazy"' : ''}>${f.legenda ? `<figcaption>${esc(f.legenda)}</figcaption>` : ''}</figure>`
        : '<figure><div class="ph">Foto em breve</div></figure>').join('')}</div>
      ${imgs.length > 1 ? `<div class="thumbs" id="thumbs">${imgs.map((f, k) => `<button type="button" class="${k ? '' : 'on'}" aria-label="Foto ${k + 1}"><img src="${esc(img(f.src, d))}" alt=""${f.contain ? ' class="contain"' : ''}></button>`).join('')}</div>` : ''}
    </div>
    <div class="p-info">
      <span class="eyebrow">${esc(p.grupo)}</span>
      <h1>${esc(p.nome)}</h1>
      <div class="meta"><span class="code">${esc(p.codigo)}</span><span class="brand">${esc(p.fabricante)}</span>${p.designer ? `<span>Design ${esc(p.designer)}</span>` : ''}</div>
      ${arr(p.descricao).map(t => `<p class="desc">${esc(t)}</p>`).join('\n      ')}
      ${p.ondeEsta ? `<div class="context"><b>No ${esc(C.ambiente)}:</b> ${esc(p.ondeEsta)}</div>` : ''}
      ${detalhes.length ? `<table class="specs">${detalhes.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>` : ''}
      <div class="ctas" id="main-cta">
        <a class="btn primary" href="${ctaHref(p)}" target="_blank" rel="noopener">${ctaIcon(p)} ${esc(isBartzen(p) && C.bartzenProjetoUrl ? 'Solicite seu projeto' : (p.cta || 'Quero este produto'))}</a>
        ${p.link ? `<a class="btn" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.linkLabel || `Ver no site ${p.fabricante}`)}</a>` : ''}
      </div>
      <p class="note">Disponível na Casa Contente · Peça do ${esc(C.ambiente)}, assinado por ${esc(PRO.nome)} (${esc(PRO.escritorio)}) para a ${esc(C.evento)}.</p>
    </div>
  </article>
</main>
${outros.length ? `<section class="more"><div class="wrap">
  <span class="eyebrow">Também no ambiente</span>
  <h2>Continue <b>explorando</b></h2>
  <div class="grid">${outros.map(o => card(o, d)).join('')}</div>
</div></section>` : ''}
<div class="sticky-cta" id="sticky"><a class="btn primary" href="${ctaHref(p)}" target="_blank" rel="noopener">${ctaIcon(p)} ${esc(isBartzen(p) && C.bartzenProjetoUrl ? 'Solicite seu projeto' : (p.cta || 'Quero este produto'))}</a></div>
${footer(d)}
<script>
(() => {
  const g = document.getElementById('gal'), t = document.getElementById('thumbs');
  if (g && t) {
    const btns = [...t.children];
    g.addEventListener('scroll', () => { const k = Math.round(g.scrollLeft / g.clientWidth); btns.forEach((x, j) => x.classList.toggle('on', j === k)); }, { passive: true });
    btns.forEach((b, j) => b.addEventListener('click', () => g.scrollTo({ left: j * g.clientWidth, behavior: 'smooth' })));
  }
  // Botão fixo no celular só aparece quando o botão principal sai da tela
  const s = document.getElementById('sticky'), m = document.getElementById('main-cta');
  if (s && m && 'IntersectionObserver' in window) new IntersectionObserver(([e]) => s.classList.toggle('show', !e.isIntersecting)).observe(m);
  else if (s) s.classList.add('show');
})();
</script>
${revealScript}
</body>
</html>`;
}

// ---------- Placa de entrada (NFC + QR) ----------
// A tag NFC e o QR da placa abrem a página do ambiente; "?nfc" e "?entrada" separam as origens no analytics.
const nfcUrl = () => `${ambUrl(C)}?nfc`;
const entradaUrl = () => `${ambUrl(C)}?entrada`;
const NFC_ICON = '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" aria-hidden="true"><rect x="34" y="14" width="44" height="88" rx="9"/><path d="M50 24h12"/><circle cx="56" cy="90" r="3" fill="currentColor"/><path d="M88 46c6 7 6 21 0 28M97 38c11 12 11 32 0 44M106 30c15 17 15 43 0 60"/></svg>';
function pagePlaca(svg) {
  const t = C.tema || {};
  const escuro = t['--freijo'] || '#3b2a1d', destaque = t['--mostarda'] || '#c89a3a';
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Placa de entrada · ${esc(C.ambiente)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&family=Source+Serif+4:ital,wght@1,400&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Poppins, sans-serif; background: #ddd; }
  .hint { font-size: 13px; max-width: 210mm; margin: 16px auto; color: #333; }
  .placa { width: 210mm; height: 297mm; margin: 0 auto 24px; background: ${escuro}; color: #fff; position: relative; overflow: hidden; display: flex; flex-direction: column; }
  .foto { height: 92mm; background: url('../../dist/${C.slug}/imagens/${esc(C.imagemCapa)}') center/cover; position: relative; }
  .foto::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.05) 40%, ${escuro}); }
  .corpo { flex: 1; padding: 0 18mm 14mm; display: flex; flex-direction: column; position: relative; }
  .logo { align-self: flex-start; margin-top: -4mm; position: relative; }
  .duo { display: inline-flex; align-items: center; gap: 3.5mm; } .duo img { width: auto; } .duo-bz { height: 9mm; } .duo-cc { height: 11mm; } .duo b { font-weight: 300; font-size: 16pt; opacity: .7; }
  .eyebrow { font-size: 8.5pt; letter-spacing: 3px; text-transform: uppercase; font-weight: 600; color: ${destaque}; margin-top: 9mm; }
  h1 { font-size: 40pt; line-height: .98; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 3mm; }
  .by { font-size: 13pt; font-weight: 300; margin-top: 3mm; } .by b { font-weight: 600; }
  .nfc { margin-top: auto; display: flex; align-items: center; gap: 9mm; border: 1.2mm solid ${destaque}; border-radius: 9mm; padding: 9mm 10mm; }
  .nfc .alvo { width: 46mm; height: 46mm; flex: none; border-radius: 50%; background: ${destaque}; color: ${escuro}; display: grid; place-items: center; }
  .nfc .alvo svg { width: 30mm; height: 30mm; }
  .nfc h2 { font-size: 23pt; line-height: 1.1; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  .nfc p { font-size: 11pt; margin-top: 3mm; opacity: .85; line-height: 1.4; }
  .qr { display: flex; align-items: center; gap: 7mm; margin-top: 8mm; }
  .qr .code { width: 30mm; height: 30mm; background: #fff; padding: 2mm; border-radius: 2mm; flex: none; }
  .qr .code svg { width: 100%; height: 100%; display: block; }
  .qr p { font-size: 10pt; line-height: 1.45; opacity: .85; } .qr b { color: ${destaque}; }
  .rodape { margin-top: 8mm; padding-top: 4mm; border-top: .3mm solid rgba(255,255,255,.25); font-size: 8pt; letter-spacing: 2px; text-transform: uppercase; display: flex; justify-content: space-between; opacity: .75; }
  @media print { body { background: none; } .hint { display: none; } .placa { margin: 0; } }
</style></head><body>
<p class="hint">Placa A4 para a entrada do ambiente. Cole a tag NFC atrás do círculo "Aproxime" (gravada com: ${esc(nfcUrl())}). O QR abaixo é a alternativa para celulares sem NFC.</p>
<div class="placa">
  <div class="foto"></div>
  <div class="corpo">
    <div class="logo">${duoLogos(`../../dist/${C.slug}/imagens/`)}</div>
    <div class="eyebrow">${esc(C.evento)} · Bartzen + Casa Contente apresentam</div>
    <h1>${esc(C.ambiente)}</h1>
    <div class="by">por <b>${esc(PRO.nome)}</b>${PRO.escritorio && PRO.escritorio !== PRO.nome && !PRO.escritorio.startsWith(PRO.nome) ? ` · ${esc(PRO.escritorio)}` : ''}</div>
    <div class="nfc">
      <div class="alvo">${NFC_ICON}</div>
      <div><h2>Aproxime seu celular aqui</h2><p>Conheça o conceito do ambiente, a arquiteta e todas as peças — sem baixar nada.</p></div>
    </div>
    <div class="qr">
      <div class="code">${svg}</div>
      <p>Sem NFC? <b>Aponte a câmera</b> para o QR code.<br>Nas peças do ambiente, procure os QR codes para ver cada produto.</p>
    </div>
    <div class="rodape"><span>${esc(C.local)}</span><span>A partir de ${esc(C.abertura)}</span></div>
  </div>
</div>
</body></html>`;
}

// ---------- Folha de QR codes para impressão ----------
function pageQR(svgs) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>QR codes · ${esc(C.ambiente)}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: Poppins, sans-serif; background: #eee; color: #1d1611; padding: 16px; }
  .hint { max-width: 190mm; margin: 0 auto 16px; font-size: 13px; }
  .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; max-width: 190mm; margin: 0 auto; }
  .tag { background: #fff; border: 1px solid #ddd; padding: 5mm; text-align: center; break-inside: avoid; }
  .tag .logo { display: flex; justify-content: center; }
  .duo { display: inline-flex; align-items: center; gap: 1.5mm; } .duo img { width: auto; } .duo-bz { height: 4.5mm; } .duo-cc { height: 5.5mm; } .duo b { font-weight: 300; font-size: 8pt; color: #888; }
  .tag svg { width: 100%; max-width: 40mm; margin: 3mm auto 2mm; display: block; }
  .tag .code { font-size: 7pt; letter-spacing: 2px; color: #c89a3a; font-weight: 600; text-transform: uppercase; }
  .tag .name { font-size: 9.5pt; font-weight: 600; line-height: 1.25; margin: 1mm 0 2mm; min-height: 2.5em; display: flex; align-items: center; justify-content: center; }
  .tag .cta { font-size: 6.5pt; letter-spacing: 1px; text-transform: uppercase; color: #666; border-top: 1px solid #eee; padding-top: 2mm; }
  @media print { body { background: #fff; padding: 0; } .hint { display: none; } .tag { border-color: #ccc; } }
</style></head><body>
<p class="hint">Imprima em A4 (Ctrl/Cmd + P). Os arquivos individuais em SVG e PNG estão na mesma pasta, para a gráfica.</p>
<div class="sheet">
${P.map((p, i) => `<div class="tag">
  <div class="logo">${duoLogos(`../../dist/${C.slug}/imagens/`, true)}</div>
  ${svgs[i]}
  <div class="code">${esc(p.codigo)} · ${esc(C.ambiente)}</div>
  <div class="name">${esc(p.nome)}</div>
  <div class="cta">Aponte a câmera e conheça</div>
</div>`).join('\n')}
</div></body></html>`;
}

// ---------- Build ----------
(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const QRROOT = path.join(ROOT, 'qrcodes');
  fs.rmSync(QRROOT, { recursive: true, force: true });
  const opts = { errorCorrectionLevel: 'M', margin: 1, color: { dark: '#000000', light: '#ffffff' } };

  for (const amb of AMBIENTES) {
    ({ C, P } = amb); PRO = C.profissional;
    const slugs = new Set();
    for (const p of P) {
      if (!/^[a-z0-9-]+$/.test(p.slug)) throw new Error(`slug inválido: "${p.slug}" (use só a-z, 0-9 e hífen)`);
      if (slugs.has(p.slug)) throw new Error(`slug repetido: ${p.slug}`);
      slugs.add(p.slug);
    }
    const A = path.join(OUT, C.slug);
    fs.mkdirSync(path.join(A, 'assets'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'src/style.css'), path.join(A, 'assets/style.css'));

    const pages = [['index.html', pageIndex()]];
    P.forEach((p, i) => pages.push([`produtos/${p.slug}/index.html`, pageProduto(p, i)]));
    // Copia só as imagens que as páginas deste ambiente usam
    const usadas = new Set([C.imagemCapa, 'logo-bartzen.svg', 'logo-casacontente.svg'].filter(Boolean)); // versões escuras: folha de QR codes
    for (const [f, html] of pages) {
      fs.mkdirSync(path.dirname(path.join(A, f)), { recursive: true });
      fs.writeFileSync(path.join(A, f), html);
      for (const m of html.matchAll(/imagens\/([^"')\s]+)/g)) usadas.add(m[1]);
    }
    for (const f of usadas) {
      const src = path.join(ROOT, 'imagens', f);
      if (!fs.existsSync(src)) { console.warn(`⚠ imagem não encontrada: imagens/${f} (${C.slug})`); continue; }
      fs.mkdirSync(path.dirname(path.join(A, 'imagens', f)), { recursive: true });
      fs.copyFileSync(src, path.join(A, 'imagens', f));
    }

    // QR codes ficam fora de dist/ (material de impressão, não vai para o servidor)
    const QR = path.join(QRROOT, C.slug);
    fs.mkdirSync(QR, { recursive: true });
    const svgs = [];
    for (const p of P) {
      const svg = await QRCode.toString(qrUrl(p), { ...opts, type: 'svg' });
      fs.writeFileSync(path.join(QR, `${p.codigo}_${p.slug}.svg`), svg);
      await QRCode.toFile(path.join(QR, `${p.codigo}_${p.slug}.png`), qrUrl(p), { ...opts, width: 1200 });
      svgs.push(svg);
    }
    fs.writeFileSync(path.join(QR, 'imprimir.html'), pageQR(svgs));
    const svgEntrada = await QRCode.toString(entradaUrl(), { ...opts, type: 'svg' });
    fs.writeFileSync(path.join(QR, 'placa-entrada.html'), pagePlaca(svgEntrada));
    await QRCode.toFile(path.join(QR, 'ENTRADA_qr.png'), entradaUrl(), { ...opts, width: 1200 });
    fs.writeFileSync(path.join(QR, 'NFC - gravar na tag.txt'), `Grave esta URL na tag NFC da placa de entrada (registro NDEF do tipo URL/URI):\n\n${nfcUrl()}\n`);
    fs.writeFileSync(path.join(QR, 'links.csv'), 'codigo,produto,url\n' + [`ENTRADA-NFC,"${C.ambiente} (tag NFC da entrada)",${nfcUrl()}`, `ENTRADA-QR,"${C.ambiente} (QR da placa de entrada)",${entradaUrl()}`].concat(P.map(p => `${p.codigo},"${p.nome}",${qrUrl(p)}`)).join('\n'));
    console.log(`✓ ${C.ambiente}: ${P.length} produtos · dist/${C.slug}/ · ${ambUrl(C)}`);
  }
})().catch(e => { console.error('✗', e.message); process.exit(1); });
