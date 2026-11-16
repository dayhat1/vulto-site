/* Powered by Matioli616
   =========================================================================
   VULTO · comportamento do blog e da privacidade
   Sem dependências. A home tem o próprio motor (scroll-craft, em home.js);
   aqui ficam só os botões de WhatsApp, o ano, o revelar ao rolar, a barra de
   leitura e o filtro do blog. Tudo parado com "menos movimento".
   ========================================================================= */
(() => {
  'use strict';

  // Número do WhatsApp da Vulto (só dígitos, com 55 + DDD). Troque aqui e todos os botões mudam.
  const WHATSAPP = '5521951001137';

  const d = document;
  const root = d.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- WhatsApp e ano ---------- */
  d.querySelectorAll('[data-wa]').forEach((a) => {
    a.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(a.dataset.wa);
    a.target = '_blank';
    a.rel = 'noopener';
  });
  const ano = d.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  /* ---------- Revelar ao rolar ---------- */
  const REVEAL = '.post-card, .related-card, .offer-box, .cta-box, .sources';  // a manchete já está na primeira tela: não esconde
  const targets = Array.from(d.querySelectorAll(REVEAL));
  targets.forEach((el) => {
    const sibs = Array.from(el.parentElement ? el.parentElement.children : []).filter((c) => c.matches(REVEAL));
    const i = Math.min(sibs.indexOf(el), 6);
    if (i > 0) el.style.setProperty('--d', i * 80 + 'ms');
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
})();
