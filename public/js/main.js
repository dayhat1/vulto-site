/* Powered by Matioli616
   =========================================================================
   VULTO · main.js (home v3)
   Nav, WhatsApp, ano, tilt dos cases, posts do blog, hero 3D e animações.
   Regras:
   - Sem JS ou com "menos movimento": a página inteira já está visível.
   - Three.js só baixa em desktop (>= 768px, ponteiro fino), com WebGL e sem
     reduced-motion. No celular o hero fica com a silhueta em SVG.
   - GSAP/ScrollTrigger entram por import() depois do load e só ligam as
     animações dentro de gsap.matchMedia (prefers-reduced-motion: no-preference).
   ========================================================================= */

// Número do WhatsApp da Vulto (só dígitos, 55 + DDD). Troque aqui e todos os botões mudam.
const WHATSAPP = '5521951001137';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- WhatsApp e ano ---------- */
$$('[data-wa]').forEach((a) => {
  a.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(a.dataset.wa);
  a.target = '_blank';
  a.rel = 'noopener';
});
const ano = $('#ano');
if (ano) ano.textContent = new Date().getFullYear();

/* ---------- Nav: hambúrguer acessível ---------- */
(() => {
  const btn = $('.nav-toggle');
  const menu = $('#menu');
  if (!btn || !menu) return;
  const set = (open) => {
    menu.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('is-open')) { set(false); btn.focus(); } });
  matchMedia('(min-width: 768px)').addEventListener('change', (m) => { if (m.matches) set(false); });
})();

/* ---------- Tilt 3D dos cases (desligado em touch e com reduced-motion) ---------- */
(() => {
  if (reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add('is-tilting');
      el.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
})();

/* ---------- Blog: 3 posts mais recentes de /blog/posts.json (fallback = HTML estático) ---------- */
(() => {
  const box = $('[data-posts]');
  if (!box || !('fetch' in window)) return;
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  fetch('/blog/posts.json', { credentials: 'omit' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('posts.json'))))
    .then((list) => {
      const top = list.slice(0, 3);
      if (top.length < 3) return;
      const same = top.every((p, i) => box.children[i] && box.children[i].getAttribute('href') === `/blog/${p.slug}/`);
      if (same) return;
      const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = txt; return e; };
      const cards = top.map((p) => {
        const a = document.createElement('a');
        a.className = 'card post';
        a.href = `/blog/${p.slug}/`;
        const thumb = mk('div', 'thumb', '');
        if (p.cover) {
          const img = document.createElement('img');
          img.src = p.cover; img.alt = p.coverAlt || ''; img.width = 800; img.height = 450;
          img.loading = 'lazy'; img.decoding = 'async';
          thumb.append(img);
        }
        const [y, m, d] = p.date.split('-').map(Number);
        const body = mk('div', 'post-body', '');
        body.append(mk('span', 'tag', p.tag), mk('h3', '', p.title), mk('p', '', p.summary),
          mk('span', 'post-meta', `${d} ${MES[m - 1]} ${y} · ${p.readingTime} min de leitura`));
        a.append(thumb, body);
        return a;
      });
      box.replaceChildren(...cards);
    })
    .catch(() => { /* fica o bloco estático */ });
})();

/* ---------- Hero 3D (import dinâmico, só quando o fallback não se aplica) ---------- */
// Estado compartilhado com scenes.js, escrito pelo ScrollTrigger:
//   p    = progresso do scroll no hero (0..1): o planeta se desfaz em fumaça
//   proc = progresso da seção "Como funciona" (0..1); -1 = sem ScrollTrigger (a cena anima sozinha)
const heroState = { p: 0, proc: -1 };
let stRefresh = () => {};
(() => {
  const hero = $('.hero');
  const canvas = $('#scenes-canvas');
  if (!hero || !canvas) return;
  const webgl = (() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (_) { return false; }
  })();
  const conn = navigator.connection;
  const ok = matchMedia('(min-width: 768px)').matches
    && !matchMedia('(pointer: coarse)').matches
    && !reduce && webgl && !(conn && conn.saveData);
  if (!ok) return; // mobile, touch, reduced-motion, sem WebGL: o SVG do hero é o hero

  const root = document.documentElement;
  const boot = () => import('/js/scenes.js?v=3')
    .then((m) => m.mountScenes({
      canvas,
      state: heroState,
      watchdog: !/[?&]fps=off/.test(location.search),
      onReady: () => { root.classList.add('scenes'); hero.classList.add('has-3d'); setTimeout(stRefresh, 120); },
      onFail: () => { root.classList.remove('scenes'); hero.classList.remove('has-3d'); setTimeout(stRefresh, 120); },
    }))
    .catch(() => { /* sem 3D: segue o fallback */ });
  // Depois do primeiro paint: o H1 já renderizou antes do canvas.
  const go = () => (window.requestIdleCallback || ((f) => setTimeout(f, 150)))(boot);
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
})();

/* ---------- Animações de scroll (GSAP + ScrollTrigger) ---------- */
async function motion() {
  let gsap, ScrollTrigger;
  try {
    ({ gsap } = await import('gsap'));
    ({ ScrollTrigger } = await import('gsap/ScrollTrigger'));
  } catch (_) { return; } // CDN fora do ar: página segue estática e legível
  gsap.registerPlugin(ScrollTrigger);
  stRefresh = () => ScrollTrigger.refresh(); // os slots 3D mudam o layout: recalcula os pins

  const mm = gsap.matchMedia();
  mm.add({ ok: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 768px)' }, (ctx) => {
    const { ok, wide } = ctx.conditions;
    if (!ok) return; // reduced-motion: nada é escondido, nada anima

    /* Hero: ao sair, a silhueta se desfaz em fumaça (scenes.js lê heroState.p) e o texto sobe */
    const heroTrig = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 };
    gsap.to(heroState, { p: 1, ease: 'none', scrollTrigger: heroTrig });
    gsap.to('.hero-copy', { y: -70, opacity: 0, ease: 'none', scrollTrigger: { ...heroTrig, end: '70% top' } });
    gsap.to('.hero-sil', { y: -90, opacity: 0, ease: 'none', scrollTrigger: heroTrig });

    /* Reveals em stagger: só esconde o que ainda está abaixo da dobra */
    const items = $$('[data-reveal]').filter((el) => el.getBoundingClientRect().top > innerHeight * 0.9);
    gsap.set(items, { opacity: 0, y: 36 });
    ScrollTrigger.batch(items, {
      start: 'top 90%',
      once: true,
      onEnter: (els) => gsap.to(els, {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1,
        // limpa o transform inline para o tilt dos cases (CSS) voltar a mandar
        clearProps: 'opacity,transform',
      }),
    });

    /* Como funciona: seção pinada (desktop). A linha em accent acompanha o scroll
       e cada passo acende quando a linha chega nele. No celular não pina:
       a linha só acompanha a rolagem da lista. */
    const steps = $('.steps');
    const dots = $$('.step');
    if (steps && dots.length) {
      steps.classList.add('is-live');
      const prog = { p: 0 };
      heroState.proc = 0;
      const paint = () => {
        heroState.proc = prog.p; // a cena "pipeline" acende os mini PCs conforme este valor
        steps.style.setProperty('--p', prog.p.toFixed(4));
        dots.forEach((s, i) => s.classList.toggle('is-on', prog.p >= (i / dots.length) * 0.92));
      };
      paint();
      gsap.to(prog, {
        p: 1, ease: 'none', onUpdate: paint,
        scrollTrigger: wide
          ? { trigger: '.process', start: 'top top', end: '+=240%', pin: true, scrub: 0.5, anticipatePin: 1 }
          : { trigger: steps, start: 'top 75%', end: 'bottom 60%', scrub: 0.5 },
      });
    }

    // quando esta matchMedia é desfeita (ex.: usuário liga reduced-motion), volta ao estado estático
    return () => { heroState.proc = -1; if (steps) { steps.classList.remove('is-live'); steps.style.removeProperty('--p'); dots.forEach((s) => s.classList.remove('is-on')); } };
  });

  // layout muda depois das fontes e das imagens: recalcula as posições
  const refresh = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  addEventListener('load', refresh, { once: true });
}

if (!reduce) {
  const go = () => (window.requestIdleCallback || ((f) => setTimeout(f, 50)))(motion);
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
}
