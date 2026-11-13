// Powered by Matioli616
import { chromium } from 'playwright-core';
const [,, url, out, w='1440', h='900', full='1', extra=''] = process.argv;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, reducedMotion: extra.includes('reduced') ? 'reduce' : 'no-preference' });
const p = await ctx.newPage();
const errs = []; p.on('console', m => { if (m.type()==='error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(1800);
await p.screenshot({ path: out, fullPage: full==='1' });
console.log('errors:', errs.slice(0,6));
await b.close();
