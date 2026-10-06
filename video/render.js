// Renderiza video/<nome>.html quadro a quadro e monta um MP4 com ffmpeg.
// Uso: node video/render.js studio-bossa  → entregas/<nome>.mp4
const puppeteer = require('puppeteer-core');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const nome = process.argv[2] || 'studio-bossa';
const FPS = 30, W = 1080, H = 1920;
const frames = path.join(__dirname, 'frames', nome);

(async () => {
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  await page.goto('file://' + path.join(__dirname, nome + '.html'), { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  const dur = await page.evaluate(() => window.DURATION);
  const total = Math.round(dur * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    await page.screenshot({ path: path.join(frames, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (f % 150 === 0) console.log(`quadro ${f}/${total}`);
  }
  await browser.close();
  const out = path.join(__dirname, '..', 'entregas', `${nome}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out]);
  console.log('✓', out);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
