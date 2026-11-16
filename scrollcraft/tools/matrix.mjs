// Powered by Matioli616
import { chromium } from 'playwright-core';
const url = process.argv[2] || 'http://localhost:4500/';
const run = async (name, w, h, opts = {}, args = []) => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', ...args] });
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference', hasTouch: !!opts.touch, isMobile: !!opts.touch, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(800); await p.mouse.move(700, 400); await p.mouse.move(720, 420); await p.waitForTimeout(1800);
  const info = await p.evaluate(() => ({ has3d: document.querySelector('.hero').classList.contains('has-3d'), canvas: !!document.querySelector('.hero-3d'), overflowX: document.documentElement.scrollWidth - innerWidth, pan: !!document.querySelector('.is-pan'), stat: document.querySelector('.process').classList.contains('is-static') }));
  await p.screenshot({ path: `scrollcraft/lab/${name}.png`, fullPage: !!opts.full });
  console.log(name, JSON.stringify(info), errs.slice(0, 3));
  await b.close();
};
await run('fb-nowebgl-1440', 1440, 900, {}, ['--disable-gpu', '--disable-3d-apis', '--disable-webgl', '--disable-webgl2']);
await run('fb-reduced-1440', 1440, 900, { reduced: true, full: true });
await run('m-390', 390, 844, { touch: true });
await run('t-768', 768, 1024, {});
