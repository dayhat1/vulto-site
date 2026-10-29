/* =========================================================================
   VULTO · comportamento compartilhado (landing + blog)
   Sem dependências. O Three.js só é baixado no desktop, depois que a
   página já pintou, e nunca com "menos movimento" ou economia de dados.
   ========================================================================= */
(() => {
  'use strict';

  // Número do WhatsApp da Vulto (só dígitos, com 55 + DDD). Troque aqui e todos os botões mudam.
  const WHATSAPP = '5521951001137';

  const d = document;
  const root = d.documentElement;
  root.classList.add('js');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = matchMedia('(min-width: 900px)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);

  /* ---------- WhatsApp ---------- */
  d.querySelectorAll('[data-wa]').forEach((a) => {
    a.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(a.dataset.wa);
    a.target = '_blank';
    a.rel = 'noopener';
  });
  const ano = d.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- Revelar ao rolar ---------- */
  const REVEAL = '.block-head, .pain, .plan, .combo, .pilot, .steps li, .more li, .faq details, .final-box,' +
                 ' .post-card, .lead-story, .related-card, .offer-box, .cta-box, .sources';
  const targets = Array.from(d.querySelectorAll(REVEAL));
  // Escalonar irmãos: cada um entra 70ms depois do anterior (máx. 6 passos).
  targets.forEach((el) => {
    const sibs = Array.from(el.parentElement ? el.parentElement.children : []).filter((c) => c.matches(REVEAL));
    const i = Math.min(sibs.indexOf(el), 6);
    if (i > 0) el.style.setProperty('--d', i * 70 + 'ms');
  });
  const show = (el) => el.classList.add('is-in');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach(show);
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- Tilt 3D + reflexo ---------- */
  const TILT = '.plan, .phone, .post-card, .lead-story, .related-card';
  d.querySelectorAll(TILT).forEach((el) => {
    el.setAttribute('data-tilt', '');
    if (!el.matches(REVEAL)) el.classList.add('is-in');
    if (reduce || !finePointer) return;
    const glare = d.createElement('span');
    glare.className = 'glare';
    glare.setAttribute('aria-hidden', 'true');
    el.appendChild(glare);
    const MAX = el.classList.contains('phone') ? 9 : 6;
    let raf = 0;
    el.addEventListener('pointermove', (ev) => {
      const r = el.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width;
      const py = (ev.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.classList.add('tilting');
        el.style.setProperty('--ry', ((px - 0.5) * 2 * MAX).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((0.5 - py) * 2 * MAX).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
    });
    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(raf);
      el.classList.remove('tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });

  /* ---------- Contadores (0 → valor quando entra na tela) ---------- */
  const COUNT = '.price .val, .stat-row > span:last-child, .stat-row > b';
  const counters = Array.from(d.querySelectorAll(COUNT)).filter((el) => /^\d+$/.test(el.textContent.trim()));
  if (!reduce && counters.length && 'IntersectionObserver' in window) {
    const run = (el) => {
      const end = parseInt(el.textContent.trim(), 10);
      const dur = 1100;
      const t0 = performance.now();
      el.style.minWidth = el.offsetWidth + 'px'; // sem pulo de layout enquanto conta
      const step = (t) => {
        const k = Math.min((t - t0) / dur, 1);
        el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const co = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  }

  /* ---------- Brilho pulsando nos botões principais ---------- */
  d.querySelectorAll('.hero .btn-red, .final .btn-red, .cta-box .btn-red').forEach((b) => b.classList.add('pulse'));

  /* ---------- Cursor personalizado ---------- */
  if (finePointer && !reduce) {
    const dot = d.createElement('div');
    const ring = d.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    d.body.append(dot, ring);
    let mx = -100, my = -100, rx = -100, ry = -100, started = false;
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!started) { started = true; rx = mx; ry = my; root.classList.add('has-cursor'); loop(); }
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    }, { passive: true });
    d.addEventListener('pointerleave', () => root.classList.remove('has-cursor'));
    d.addEventListener('pointerenter', () => { if (started) root.classList.add('has-cursor'); });
    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      requestAnimationFrame(loop);
    };
    d.addEventListener('pointerover', (e) => {
      ring.classList.toggle('hover', !!e.target.closest('a, button, summary, [data-filter], [data-tilt]'));
    });
  }

  /* ---------- Barra de progresso de leitura (posts) ---------- */
  const bar = d.querySelector('.read-progress span');
  const article = d.querySelector('article.post');
  if (bar && article) {
    let ticking = false;
    const update = () => {
      const r = article.getBoundingClientRect();
      const total = r.height - innerHeight;
      const k = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 1;
      bar.style.transform = `scaleX(${k.toFixed(4)})`;
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------- Filtro por categoria (índice do blog) ---------- */
  const filters = d.querySelectorAll('[data-filter]');
  if (filters.length) {
    const cards = d.querySelectorAll('[data-cat]');
    filters.forEach((btn) => btn.addEventListener('click', () => {
      const cat = btn.dataset.filter;
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      cards.forEach((c) => { c.hidden = !(cat === 'todas' || c.dataset.cat === cat); });
    }));
  }

  /* ---------- Hero 3D (só desktop, depois do primeiro paint) ---------- */
  const hero = d.querySelector('.hero');
  const webgl = (() => {
    try { const c = d.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (_) { return false; }
  })();
  if (hero && desktop && finePointer && !reduce && !saveData && webgl) {
    const boot = () => import('/js/hero3d.js').then((m) => m.default(hero)).catch(() => { /* sem 3D, segue o brilho em CSS */ });
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
    if (d.readyState === 'complete') idle(boot);
    else addEventListener('load', () => idle(boot), { once: true });
  }
})();
