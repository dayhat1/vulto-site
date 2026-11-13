/* Powered by Matioli616
   =========================================================================
   VULTO · home v2
   Liga o scroll-craft na home. Todo data-sc-* é escrito aqui, ANTES do
   ScrollCraft.mount: sem JS (ou com "menos movimento") a página inteira fica
   visível e estática. O hero 3D é lazy-load, depois do primeiro paint.
   ========================================================================= */
(() => {
  'use strict';
  const d = document;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const set = (el, attrs) => { if (el) for (const k in attrs) el.setAttribute(k, attrs[k]); return el; };

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = innerWidth >= 1000 && innerHeight >= 760;

  /* ---------- Movimento do scroll-craft ---------- */
  const process = $('.process');
  const services = $('.services');

  if (reduce || !window.ScrollCraft) {
    // Sem motion: etapas empilhadas, silhueta completa, nada escondido.
    if (process) process.classList.add('is-static');
  } else {
    // Hero (flow): o celular e o vulto de fallback andam em ritmos diferentes.
    set($('.hero'), { 'data-sc-act': 'flow' });
    set($('.hero .demo'), { 'data-sc-parallax': '-0.07' });
    set($('.hero-vulto'), { 'data-sc-parallax': '0.1' });

    // Prova: números reais, sobem uma vez quando entram.
    set($('.proof-list'), { 'data-sc-in': '', 'data-sc-stagger': '70' });
    $$('.proof [data-count]').forEach((el) => {
      set(el, { 'data-sc-count': '0 ' + el.textContent.trim(), 'data-sc-count-ms': '1300' });
    });

    // Cabeçalhos de seção: título por linha, o resto sobe junto.
    const head = (sec) => {
      if (!sec) return;
      set(sec, { 'data-sc-act': 'flow' });
      set($('.block-head h2', sec), { 'data-sc-cue': '0.06', 'data-sc-kinetic': 'lines' });
      $$('.block-head > :not(h2)', sec).forEach((el) => set(el, { 'data-sc-in': '' }));
    };
    head($('.pains-sec'));
    set($('.pains'), { 'data-sc-in': '', 'data-sc-stagger': '110' });

    // Serviços: trilho lateral no desktop com altura; grade que sobe nos demais.
    if (services && wide) {
      services.classList.add('is-pan');
      set(services, { 'data-sc-act': 'pan', 'data-sc-span': '3.2' });
      set($('.services-stage', services), { 'data-sc-stage': '' });
      set($('.plans', services), { 'data-sc-pan': '0.05' });
    } else if (services) {
      set($('.plans', services), { 'data-sc-in': '', 'data-sc-stagger': '90' });
    }
    set($('.combo'), { 'data-sc-in': '' });
    set($('.pilot'), { 'data-sc-in': '' });
    set($('.more-box'), { 'data-sc-in': '', 'data-sc-stagger': '80' });

    // Processo (pico): a seção pinada mais longa. Cada etapa desenha uma parte do vulto.
    if (process) {
      set(process, { 'data-sc-act': 'pin', 'data-sc-span': '5.6' });
      set($('.process-stage', process), { 'data-sc-stage': '' });
      const cues = ['0 0.3 0', '0.24 0.56', '0.5 0.8', '0.72 1 0.1 0.02'];
      $$('.step', process).forEach((el, i) => set(el, { 'data-sc-cue': cues[i] }));
    }

    // Blog e dúvidas.
    set($('.blog .block-head'), { 'data-sc-in': '', 'data-sc-stagger': '80' });
    set($('.posts'), { 'data-sc-in': '', 'data-sc-stagger': '110' });
    set($('.posts-all'), { 'data-sc-in': '' });
    set($('.faq-sec .block-head'), { 'data-sc-in': '', 'data-sc-stagger': '80' });

    // CTA final (pin curto): o vulto inteiro assenta, uma ação.
    const fin = $('.final');
    if (fin) {
      set(fin, { 'data-sc-act': 'pin', 'data-sc-span': '1.5' });
      set($('.final-stage', fin), { 'data-sc-stage': '', 'data-sc-spotlight': '' });
      set($('.btn', fin), { 'data-sc-magnet': '0.26' });
    }

    // Progresso e grão.
    const prog = d.createElement('span');
    prog.setAttribute('data-sc-progress', '');
    d.body.prepend(prog);
    const grain = d.createElement('div');
    grain.className = 'sc-grain';
    grain.setAttribute('aria-hidden', 'true');
    d.body.append(grain);

    window.ScrollCraft.mount(d.body);
  }

  /* ---------- Blog: posts mais recentes (o motor publica todo dia) ---------- */
  const posts = $('[data-posts]');
  if (posts && 'fetch' in window && 'DOMParser' in window) {
    fetch('/blog/', { credentials: 'omit' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('blog'))))
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const cards = [doc.querySelector('.lead-story'), ...$$('.post-card', doc)].filter(Boolean).slice(0, 3);
        if (cards.length < 3) return;
        const items = cards.map((c) => {
          const a = d.createElement('a');
          a.className = 'post';
          a.href = c.getAttribute('href');
          const src = c.querySelector('img');
          const body = c.querySelector('.card-body');
          const raw = src ? src.getAttribute('src') || '' : '';
          const thumb = d.createElement('div');
          thumb.className = 'thumb';
          const img = d.createElement('img');
          img.src = raw.endsWith('.webp') ? raw.replace(/\.webp$/, '-800.webp') : raw;
          img.alt = src ? src.getAttribute('alt') || '' : '';
          img.width = 800; img.height = 450; img.loading = 'lazy'; img.decoding = 'async';
          thumb.append(img);
          const pb = d.createElement('div');
          pb.className = 'post-body';
          const mk = (tag, cls, txt) => { const e = d.createElement(tag); if (cls) e.className = cls; e.textContent = txt; return e; };
          const chip = body && body.querySelector('.chip');
          const t = body && body.querySelector('h2, h3');
          const p = body && body.querySelector('p');
          const m = body && body.querySelector('.card-meta');
          if (chip) pb.append(mk('span', 'chip', chip.textContent));
          if (t) pb.append(mk('h3', '', t.textContent));
          if (p) pb.append(mk('p', '', p.textContent));
          if (m) pb.append(mk('span', 'post-meta', m.textContent));
          a.append(thumb, pb);
          return a;
        });
        const same = items.every((a, i) => posts.children[i] && posts.children[i].getAttribute('href') === a.getAttribute('href'));
        if (same) return;
        const shown = posts.classList.contains('sc-in');
        items.forEach((a) => { if (shown) a.classList.add('sc-in'); });
        posts.replaceChildren(...items);
      })
      .catch(() => { /* fica o bloco estático */ });
  }
})();
