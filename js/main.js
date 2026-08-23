/* ============================================================
   ALETHEIA — choreography
   Loader → constellation assembly → unconcealment scroll story
   ============================================================ */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1.0 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // anchor links through Lenis
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const el = document.querySelector(a.getAttribute('href'));
        if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -70, duration: 1.4 }); }
      });
    });
  }

  /* ---------- Loader: the seal draws itself ---------- */
  const loader = document.getElementById('loader');
  const seen = sessionStorage.getItem('aletheia-seen');

  // build the 13 rays in the loader mark
  const raysG = loader && loader.querySelector('.rays');
  if (raysG) {
    const NS = 'http://www.w3.org/2000/svg';
    for (let r = 0; r < 13; r++) {
      const frac = r / 12;
      const a = (-160 + frac * 140) * Math.PI / 180;
      const inner = 26, outer = r % 2 === 0 ? 44 : 36;
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', 100 + Math.cos(a) * inner);
      ln.setAttribute('y1', 96 + Math.sin(a) * inner);
      ln.setAttribute('x2', 100 + Math.cos(a) * outer);
      ln.setAttribute('y2', 96 + Math.sin(a) * outer);
      ln.setAttribute('stroke-width', r % 2 === 0 ? 1.8 : 1);
      raysG.appendChild(ln);
    }
  }

  function beginSite() {
    document.body.classList.add('ready');
    // constellation assembles
    gsap.to(window.__aletheia || {}, { assemble: 1, duration: 2.6, ease: 'power2.out' });
    // hero text rises
    gsap.fromTo('.hero-title .line > span',
      { yPercent: 118 },
      { yPercent: 0, duration: 1.3, stagger: 0.14, ease: 'power4.out', delay: 0.25 });
    gsap.fromTo('[data-hero-fade]',
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out', delay: 0.8 });
  }

  if (reduced || seen || !loader) {
    if (loader) loader.remove();
    document.body.classList.add('no-loader');
    if (window.__aletheia) window.__aletheia.assemble = 1;
    beginSite();
  } else {
    sessionStorage.setItem('aletheia-seen', '1');
    const strokes = loader.querySelectorAll('.mark circle, .mark path, .mark line');
    strokes.forEach((el) => {
      const len = el.getTotalLength ? el.getTotalLength() : 300;
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
    });
    const tl = gsap.timeline({
      onComplete: () => { loader.remove(); }
    });
    tl.to(loader.querySelectorAll('.mark .ring'), { strokeDashoffset: 0, duration: 1.0, stagger: 0.12, ease: 'power2.inOut' })
      .to(loader.querySelectorAll('.mark .rays line'), { strokeDashoffset: 0, duration: 0.5, stagger: 0.03, ease: 'power2.out' }, '-=0.5')
      .to(loader.querySelectorAll('.mark .sun, .mark .book'), { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.3')
      .to(loader.querySelector('.word'), { opacity: 1, duration: 0.5 }, '-=0.4')
      .to(loader.querySelector('.mark'), { scale: 0.92, opacity: 0, duration: 0.55, ease: 'power2.in' }, '+=0.5')
      .to(loader.querySelector('.word'), { opacity: 0, duration: 0.3 }, '<')
      .add(beginSite, '-=0.1')
      .to(loader.querySelector('.shutter.top'), { scaleY: 0, duration: 0.9, ease: 'power4.inOut' }, '<')
      .to(loader.querySelector('.shutter.bottom'), { scaleY: 0, duration: 0.9, ease: 'power4.inOut' }, '<')
      .set(loader, { pointerEvents: 'none' }, '<');
  }

  /* ---------- Progress hairline + nav state ---------- */
  gsap.to('#progress', {
    scaleX: 1, ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.4 }
  });
  const nav = document.getElementById('nav');
  ScrollTrigger.create({
    start: 80,
    onUpdate: (self) => nav.classList.toggle('scrolled', self.scroll() > 80),
    onEnter: () => nav.classList.add('scrolled'),
    onLeaveBack: () => nav.classList.remove('scrolled')
  });

  /* ---------- Hero: dispersal of the constellation on scroll ---------- */
  if (!reduced) {
    ScrollTrigger.create({
      trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.5,
      onUpdate: (self) => { if (window.__aletheia) window.__aletheia.disperse = self.progress; }
    });
    gsap.to('.hero-content', {
      y: -110, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: '75% top', scrub: 0.4 }
    });
  }

  /* ---------- Manifesto: words ignite as the light passes ---------- */
  const mtext = document.getElementById('manifesto-text');
  if (mtext) {
    // wrap each word (preserving .em spans)
    const wrapWords = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((tok) => {
            if (/^\s+$/.test(tok) || tok === '') { frag.appendChild(document.createTextNode(tok)); }
            else {
              const s = document.createElement('span');
              s.className = 'w'; s.textContent = tok;
              frag.appendChild(s);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) wrapWords(child);
      });
    };
    wrapWords(mtext);
    const words = mtext.querySelectorAll('.w');

    if (!reduced) {
      gsap.set('.beam', { '--bx': '50%', '--by': '-10%' });
      const mtl = gsap.timeline({
        scrollTrigger: {
          trigger: '.manifesto-pin', start: 'top top', end: '+=190%',
          pin: true, scrub: 0.35, anticipatePin: 1
        }
      });
      mtl.to(words, { opacity: 1, stagger: { each: 0.9, ease: 'none' }, duration: 24, ease: 'none' }, 0)
         .to('.beam', { '--by': '110%', ease: 'none', duration: 30 }, 0)
         .to('.manifesto-sig', { opacity: 1, y: 0, duration: 6 }, '>-4');
    } else {
      words.forEach(w => w.style.opacity = 1);
      document.querySelector('.manifesto-sig').style.opacity = 1;
    }
  }

  /* ---------- Generic reveals ---------- */
  if (!reduced) {
    document.querySelectorAll('.fade-up').forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1.15, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%' }
      });
    });
    // tier cards sweep in with perspective
    gsap.utils.toArray('.tier').forEach((card, i) => {
      gsap.from(card, {
        opacity: 0, y: 90, rotateX: 8, duration: 1.3, ease: 'power3.out', delay: i * 0.12,
        scrollTrigger: { trigger: '.tiers', start: 'top 82%' }
      });
    });
  } else {
    document.querySelectorAll('.fade-up').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
  }

  /* ---------- Tier tilt + shine tracking ---------- */
  if (!coarse && !reduced) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      let rx = 0, ry = 0;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        rx = (0.5 - py) * 7; ry = (px - 0.5) * 9;
        gsap.to(card, { rotateX: rx, rotateY: ry, transformPerspective: 1100, duration: 0.5, ease: 'power2.out' });
      });
      card.addEventListener('pointerleave', () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.9, ease: 'elastic.out(1, 0.55)' });
      });
    });
  }

  /* ---------- Method: line draws, steps ignite ---------- */
  if (!reduced) {
    gsap.to('.method-line .fill', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '#method .steps', start: 'top 70%', end: 'bottom 55%', scrub: 0.4 }
    });
    document.querySelectorAll('.step').forEach((step) => {
      ScrollTrigger.create({
        trigger: step, start: 'top 62%',
        onEnter: () => step.classList.add('lit'),
        onLeaveBack: () => step.classList.remove('lit')
      });
      gsap.from(step, {
        opacity: 0, x: -34, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: step, start: 'top 80%' }
      });
    });
  } else {
    document.querySelectorAll('.step').forEach(s => s.classList.add('lit'));
  }

  /* ---------- Principles: depth parallax ---------- */
  if (!reduced) {
    document.querySelectorAll('#principles [data-depth]').forEach((el) => {
      const d = parseFloat(el.dataset.depth);
      gsap.to(el, {
        y: () => -(d * 130), ease: 'none',
        scrollTrigger: { trigger: '#principles', start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });
  }

  /* ---------- Demo terminal ---------- */
  const termBody = document.getElementById('term-body');
  const termNext = document.getElementById('term-next');
  if (termBody) {
    const EXCHANGES = [
      {
        q: 'Which of my GI patients are overdue for follow-up colonoscopy?',
        a: 'Reviewing your practice records… 14 patients have surveillance intervals that\nlapsed more than 90 days ago. Highest priority:\n\n  • 3 patients with prior adenomatous polyps  (interval: 3 yr — overdue 4–7 mo)\n  • 2 patients with family history of CRC     (interval: 5 yr — overdue 3 mo)\n  • 9 average-risk patients                   (interval: 10 yr)\n\nDraft recall letters are ready for front-desk review.',
        cite: '[sources: your scheduling DB · procedure notes 2016–2026 · your surveillance protocol v3]'
      },
      {
        q: 'What did my no-show rate cost the practice last quarter?',
        a: 'Q2 no-show rate was 11.4% (218 slots). At your blended reimbursement of\n$412/visit, that is ≈ $89,800 in unrecovered capacity.\n\nPattern detected: Monday 8–10 AM slots account for 31% of no-shows.\nSuggestion: overbook that window at 1.2× or shift to telehealth confirms.',
        cite: '[sources: your PM system · remittance data · appointment logs]'
      }
    ];
    let idx = 0, played = false;

    function typeLine(el, text, speed, done) {
      let i = 0;
      const caret = document.createElement('span');
      caret.className = 'caret';
      el.appendChild(caret);
      (function tick() {
        if (i < text.length) {
          caret.insertAdjacentText('beforebegin', text[i++]);
          setTimeout(tick, speed + Math.random() * speed);
        } else { caret.remove(); done && done(); }
      })();
    }

    function playExchange(n) {
      const ex = EXCHANGES[n];
      termNext.classList.remove('show');
      const qEl = document.createElement('div'); qEl.className = 'q';
      const aEl = document.createElement('div'); aEl.className = 'a';
      const cEl = document.createElement('div'); cEl.className = 'cite';
      termBody.appendChild(qEl);
      typeLine(qEl, ex.q, 26, () => {
        termBody.appendChild(aEl);
        setTimeout(() => typeLine(aEl, ex.a, 6, () => {
          cEl.textContent = ex.cite;
          cEl.style.opacity = 0;
          termBody.appendChild(cEl);
          gsap.to(cEl, { opacity: 1, duration: 0.6 });
          if (n + 1 < EXCHANGES.length) termNext.classList.add('show');
        }), 420);
      });
    }

    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting && !played) {
        played = true; obs.disconnect();
        setTimeout(() => playExchange(0), 500);
      }
    }, { threshold: 0.4 }).observe(termBody);

    termNext.addEventListener('click', () => {
      idx += 1;
      if (idx < EXCHANGES.length) {
        termBody.appendChild(document.createElement('br'));
        playExchange(idx);
      }
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (!coarse && !reduced) {
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn, {
          x: (e.clientX - r.left - r.width / 2) * 0.28,
          y: (e.clientY - r.top - r.height / 2) * 0.34,
          duration: 0.4, ease: 'power2.out'
        });
      });
      btn.addEventListener('pointerleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ---------- Custom cursor ---------- */
  if (!coarse && !reduced) {
    const cur = document.getElementById('cursor');
    document.body.classList.add('cursor-on');
    let cx = -100, cy = -100, tx = -100, ty = -100;
    window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cur.style.left = cx + 'px'; cur.style.top = cy + 'px';
    });
    document.querySelectorAll('a, button, [data-tilt]').forEach((el) => {
      el.addEventListener('pointerenter', () => cur.classList.add('grow'));
      el.addEventListener('pointerleave', () => cur.classList.remove('grow'));
    });
  }
})();
