// Exporta cada ambiente como um PDF de página única, no layout de computador (para revisão).
// Uso: node exportar-pdf.js  → entregas/<Ambiente> - prévia da página.pdf
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ambientes = fs.readdirSync('ambientes').map(f => JSON.parse(fs.readFileSync(path.join('ambientes', f))).config);

(async () => {
  fs.mkdirSync('entregas', { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  for (const c of ambientes) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('file://' + path.resolve('dist', c.slug, 'index.html'), { waitUntil: 'networkidle0' });
    await page.emulateMediaType('screen');
    await page.addStyleTag({ content: `
      .hero { min-height: 900px !important; height: 900px; }
      .reveal { opacity: 1 !important; transform: none !important; }
      .header { position: static !important; }
      .hero .bg, .hero .cutout { animation: none !important; transform: none !important; opacity: 1 !important; }` });
    await page.evaluate(async () => {
      document.querySelectorAll('img').forEach(i => (i.loading = 'eager'));
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
      await document.fonts.ready;
    });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    const out = path.join('entregas', `${c.ambiente} - prévia da página.pdf`);
    await page.pdf({ path: out, width: '1440px', height: `${h + 2}px`, printBackground: true, pageRanges: '1' });
    console.log('✓', out, `(${h}px)`);
  }
  await browser.close();
})().catch(e => { console.error('✗', e.message); process.exit(1); });
