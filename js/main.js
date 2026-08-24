/* ============================================================
   ALETHEIA — choreography (v2.1)
   Loader → constellation assembly → unconcealment scroll story
   Hardened: storage-safe, loader-failsafe, focus-visible,
   quickTo/quickSetter hot paths, live-measured vitals.
   ============================================================ */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Console signature (the colophon, for those who look) ---------- */
  try {
    console.log('%cΑΛΗΘΕΙΑ', 'color:#E7C878;font-family:Georgia,serif;font-size:22px;letter-spacing:6px;');
    console.log('%cDirected by a human architect. Engineered with an AI collaborator.\nZero external requests — view source; nothing is concealed.',
      'color:#9FB2C4;font-size:11px;line-height:1.6;');
  } catch (e) {}

  /* ---------- Storage (never let a blocked cookie jar kill the page) ---------- */
  let seen = null;
  try { seen = sessionStorage.getItem('aletheia-seen'); } catch (e) {}

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1.0 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  window.__aletheiaLenis = lenis;   // palette.js pauses scrolling while open

  // In-page anchors: smooth when possible, and always hand focus to the target
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.length < 2) return;
    a.addEventListener('click', (e) => {
      const el = document.querySelector(href);
      if (!el) return;
      e.preventDefault();
      if (lenis) {
        lenis.start();     // a stopped Lenis (mobile menu open) silently drops scrollTo
        lenis.scrollTo(el, { offset: -108, duration: 1.4 });
      } else el.scrollIntoView();
      try { history.pushState(null, '', href); } catch (err) {}
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    });
  });

  /* ---------- Scroll-velocity atmosphere (the page as a physical medium) ---------- */
  if (!reduced && lenis) {
    let vTarget = 0, vCur = 0;
    lenis.on('scroll', (e) => { vTarget = Math.min(Math.abs(e.velocity || 0) / 40, 1); });
    gsap.ticker.add(() => {
      vTarget *= 0.92;
      vCur += (vTarget - vCur) * 0.12;
      document.documentElement.style.setProperty('--scrollv', vCur < 0.005 ? '0' : vCur.toFixed(3));
    });
  }

  /* ---------- Loader: the seal draws itself ---------- */
  const loader = document.getElementById('loader');

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
    if (window.__aletheia) {
      if (reduced) window.__aletheia.assemble = 1;
      else gsap.to(window.__aletheia, { assemble: 1, duration: 2.6, ease: 'power2.out' });
    }
    if (reduced) {
      gsap.set('.hero-title .line > span', { yPercent: 0 });
      gsap.set('[data-hero-fade]', { opacity: 1, y: 0 });
      document.body.classList.add('revealed');   // release the mask — nothing may clip
      return;
    }
    gsap.fromTo('.hero-title .line > span',
      { yPercent: 118 },
      { yPercent: 0, duration: 1.3, stagger: 0.14, ease: 'power4.out', delay: 0.25,
        clearProps: 'transform',
        onComplete: () => document.body.classList.add('revealed') });
    gsap.fromTo('[data-hero-fade]',
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out', delay: 0.8,
        clearProps: 'transform' });
  }

  if (reduced || seen || !loader) {
    if (loader) loader.remove();
    document.body.classList.add('no-loader');
    beginSite();
  } else {
    try { sessionStorage.setItem('aletheia-seen', '1'); } catch (e) {}
    if (lenis) lenis.stop();
    const strokes = loader.querySelectorAll('.mark circle, .mark path, .mark line');
    strokes.forEach((el) => {
      const len = el.getTotalLength ? el.getTotalLength() : 300;
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
    });
    const tl = gsap.timeline({
      onComplete: () => { loader.remove(); if (lenis) lenis.start(); }
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

  /* ---------- Mobile menu ---------- */
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  function closeMenu() {
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    navToggle.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      mobileMenu.setAttribute('aria-hidden', String(!open));
      navToggle.setAttribute('aria-expanded', String(open));
      if (lenis) { open ? lenis.stop() : lenis.start(); }
    });
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
    });
  }

  /* ---------- Hero content recedes; the narrator carries on ---------- */
  if (!reduced) {
    gsap.to('.hero-content', {
      y: -110, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: '75% top', scrub: 0.4 }
    });
  }

  /* ---------- The descent glyph: Λ inverted, and it acts ---------- */
  {
    const d = document.getElementById('descend');
    if (d) d.addEventListener('click', () => {
      const el = document.getElementById('manifesto');
      if (lenis) { lenis.start(); lenis.scrollTo(el, { offset: -20, duration: 1.6 }); }
      else el.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ---------- The modality stage: it listens, reads, watches, answers ---------- */
  {
    const tabs = document.querySelectorAll('.mod-tab');
    const panels = { listen: null, read: null, watch: null, ask: null };
    Object.keys(panels).forEach(k => panels[k] = document.getElementById('mod-' + k));
    let active = 'listen';
    let timers = [];
    const clearTimers = () => { timers.forEach(t => clearTimeout(t)); timers = []; };
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    // LISTEN: waveform speaks, dictation types, the note assembles
    const wave = document.getElementById('wave');
    if (wave) for (let i = 0; i < 30; i++) {
      const bar = document.createElement('i');
      bar.style.setProperty('--amp', (25 + Math.random() * 70) + '%');
      bar.style.animationDelay = (Math.random() * -1.1) + 's';
      wave.appendChild(bar);
    }
    const DICTATION = '"…patient reports intermittent epigastric pain for about three weeks, worse after meals, no weight loss, denies melena…"';
    function playListen() {
      const live = document.getElementById('dict-live');
      const fields = panels.listen.querySelectorAll('.note-field');
      if (!live) return;
      live.textContent = '';
      fields.forEach(f => f.classList.remove('on'));
      if (reduced) {
        live.textContent = DICTATION;
        fields.forEach(f => f.classList.add('on'));
        return;
      }
      let i = 0;
      (function tick() {
        if (active !== 'listen') return;
        if (i < DICTATION.length) {
          live.textContent += DICTATION[i++];
          later(tick, 34 + Math.random() * 30);
        } else {
          fields.forEach((f, k) => later(() => f.classList.add('on'), 350 + k * 520));
          later(playListen, 9000);
        }
      })();
    }

    // READ: the beam passes, fields lift out with their confidence
    function playRead() {
      const chips = panels.read.querySelectorAll('.chip');
      chips.forEach(c => c.classList.remove('on'));
      if (reduced) { chips.forEach(c => c.classList.add('on')); return; }
      chips.forEach((c, k) => later(() => {
        if (active !== 'read') return;
        c.classList.add('on');
      }, 900 + k * 620));
      later(() => { if (active === 'read') playRead(); }, 900 + chips.length * 620 + 4200);
    }

    // WATCH: the timecode runs, findings land on the record
    function playWatch() {
      const tc = document.getElementById('vid-tc');
      const prog = document.getElementById('vid-prog');
      const findings = panels.watch.querySelectorAll('.finding');
      findings.forEach(f => f.classList.remove('on'));
      if (reduced) {
        findings.forEach(f => f.classList.add('on'));
        if (tc) tc.textContent = '14:32'; if (prog) prog.style.width = '100%';
        return;
      }
      const DUR = 12000, TOTAL = 14 * 60 + 32;
      const marks = [[2*60+14, 0], [6*60+47, 1], [11*60+3, 2], [14*60+29, 3]];
      const t0 = performance.now();
      (function tick() {
        if (active !== 'watch') return;
        const p = Math.min(1, (performance.now() - t0) / DUR);
        const sec = Math.floor(p * TOTAL);
        if (tc) tc.textContent = String(Math.floor(sec/60)).padStart(2,'0') + ':' + String(sec%60).padStart(2,'0');
        if (prog) prog.style.width = (p * 100) + '%';
        marks.forEach(([at, idx]) => { if (sec >= at) findings[idx] && findings[idx].classList.add('on'); });
        if (p < 1) timers.push(setTimeout(tick, 90));
        else later(playWatch, 5000);
      })();
    }

    const PLAY = { listen: playListen, read: playRead, watch: playWatch, ask: () => {} };

    function select(k) {
      if (!panels[k]) return;
      active = k;
      clearTimers();
      tabs.forEach(t => {
        const on = t.dataset.mod === k;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
      });
      Object.entries(panels).forEach(([key, p]) => { if (p) p.hidden = key !== k; });
      PLAY[k]();
      if (k === 'ask' && window.__aletheiaStartTerminal) window.__aletheiaStartTerminal();
    }
    tabs.forEach(t => t.addEventListener('click', () => select(t.dataset.mod)));

    // start/stop with visibility — no theater for an empty house
    const stage = document.querySelector('.modality');
    if (stage) new IntersectionObserver((en) => {
      if (en[0].isIntersecting) select(active);
      else clearTimers();
    }, { threshold: 0.25 }).observe(stage);
  }

  /* ---------- Manifesto: words ignite as the light passes ---------- */
  const mtext = document.getElementById('manifesto-text');
  if (mtext) {
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
      const mtl = gsap.timeline({
        scrollTrigger: {
          trigger: '.manifesto-pin', start: 'top top', end: '+=140%',
          pin: true, scrub: 0.35, anticipatePin: 1
        }
      });
      mtl.to(words, { opacity: 1, stagger: { each: 0.9, ease: 'none' }, duration: 20, ease: 'none' }, 0)
         .fromTo('.beam-spot', { y: '-30vh' }, { y: '130vh', ease: 'none', duration: 26 }, 0)
         .to('.manifesto-sig', { opacity: 1, y: 0, duration: 5 }, '>-3');
    }
  }

  /* ---------- Reveals: one batched trigger for all fade-ups ---------- */
  if (!reduced) {
    ScrollTrigger.batch('.fade-up', {
      start: 'top 86%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.15, stagger: 0.08, ease: 'power3.out' })
    });
    gsap.utils.toArray('.tier').forEach((card, i) => {
      gsap.from(card, {
        opacity: 0, y: 90, rotateX: 8, duration: 1.3, ease: 'power3.out', delay: i * 0.12,
        scrollTrigger: { trigger: '.tiers', start: 'top 82%' }
      });
    });
  }

  /* ---------- Kickers: Greek resolves into English (unconcealment, literal) ----------
     Reliable: fires on every downward entry, delayed past the fade-in so it is
     actually SEEN. Clickable: any kicker replays its own unconcealment. */
  {
    const POOL = 'ΑΛΗΘΕΙΦΣΔΠΩΞΨΓΡΤ';
    function descramble(k) {
      if (reduced || k.dataset.animating === '1') return;
      const original = k.dataset.original;
      k.dataset.animating = '1';
      const chars = original.split('');
      const resolveAt = chars.map((c, i) => 300 + i * 50);
      const t0 = performance.now();
      const iv = setInterval(() => {
        const el = performance.now() - t0;
        let done = true;
        k.textContent = chars.map((c, i) => {
          if (c === ' ' || el >= resolveAt[i]) return c;
          done = false;
          return POOL[(Math.random() * POOL.length) | 0];
        }).join('');
        if (done) { clearInterval(iv); k.dataset.animating = '0'; }
      }, 40);
    }
    document.querySelectorAll('.kicker').forEach((k) => {
      const original = k.textContent;
      if (!original.trim()) return;
      k.dataset.original = original;
      k.classList.add('replayable');
      k.setAttribute('title', 'Unconceal again');
      k.addEventListener('click', () => descramble(k));
      if (!reduced) {
        ScrollTrigger.create({
          trigger: k, start: 'top 85%',
          onEnter: () => setTimeout(() => descramble(k), 350)
        });
      }
    });
  }

  /* ---------- Tier tilt + shine (quickTo — zero per-move allocation) ---------- */
  if (!coarse && !reduced) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      let rect = null;
      const qRX = gsap.quickTo(card, 'rotateX', { duration: 0.5, ease: 'power2.out' });
      const qRY = gsap.quickTo(card, 'rotateY', { duration: 0.5, ease: 'power2.out' });
      gsap.set(card, { transformPerspective: 1100 });
      card.addEventListener('pointerenter', () => { rect = card.getBoundingClientRect(); });
      card.addEventListener('pointermove', (e) => {
        if (!rect) rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width, py = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        qRX((0.5 - py) * 7); qRY((px - 0.5) * 9);
      });
      card.addEventListener('pointerleave', () => {
        rect = null;
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.9, ease: 'elastic.out(1, 0.55)', overwrite: 'auto' });
      });
    });
  }

  /* ---------- Method: line draws, steps ignite (one trigger per step) ---------- */
  if (!reduced) {
    gsap.to('.method-line .fill', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '#method .steps', start: 'top 70%', end: 'bottom 55%', scrub: 0.4 }
    });
    document.querySelectorAll('.step').forEach((step) => {
      gsap.from(step, {
        opacity: 0, x: -34, duration: 0.9, ease: 'power3.out',
        scrollTrigger: {
          trigger: step, start: 'top 78%',
          toggleClass: { targets: step, className: 'lit' }
        }
      });
    });
  } else {
    document.querySelectorAll('.step').forEach(s => s.classList.add('lit'));
  }

  /* ---------- Principles: depth parallax (gentle — never over the heading) ---------- */
  if (!reduced) {
    document.querySelectorAll('#principles .pr[data-depth]').forEach((el) => {
      const d = parseFloat(el.dataset.depth);
      gsap.to(el, {
        y: () => -(d * 70), ease: 'none',
        scrollTrigger: { trigger: '#principles', start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      });
    });
  }

  /* ---------- Inter-section parallax: each section drifts against the page,
     and the azure pools lag behind their sections — depth at every boundary ---------- */
  if (!reduced) {
    ['#services', '#method', '#demo', '#contact'].forEach((sel) => {
      const wrap = document.querySelector(sel + ' .wrap');
      if (!wrap) return;
      gsap.fromTo(wrap, { y: 34 }, {
        y: -34, ease: 'none',
        scrollTrigger: { trigger: sel, start: 'top bottom', end: 'bottom top', scrub: 0.5 }
      });
    });
    document.querySelectorAll('.azure-pool').forEach((sec) => {
      gsap.fromTo(sec, { '--pooly': '60px' }, {
        '--pooly': '-60px', ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
      });
    });
    // the strata: watermark geometry set deep in the vellum, lagging hard
    document.querySelectorAll('[data-strata]').forEach((el) => {
      const d = parseFloat(el.dataset.strata) || 0.5;
      const sec = el.closest('section');
      gsap.fromTo(el, { y: d * 430 }, {
        y: -(d * 430), ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.9 }
      });
    });
    // principles glyphs are that section's strata — give them real travel
    document.querySelectorAll('#principles .glyph').forEach((el) => {
      const d = parseFloat(el.dataset.depth) || 0.15;
      gsap.fromTo(el, { y: d * 680 }, {
        y: -(d * 680), ease: 'none',
        scrollTrigger: { trigger: '#principles', start: 'top bottom', end: 'bottom top', scrub: 0.9 }
      });
    });
  }

  /* ---------- Demo terminal ---------- */
  const termBody = document.getElementById('term-body');
  const termNext = document.getElementById('term-next');
  const termLive = document.getElementById('term-live');
  if (termBody) {
    const EXCHANGES = [
      {
        q: 'Which of my patients are overdue for follow-up colonoscopy?',
        a: 'Reviewing your practice records… 14 patients have surveillance intervals that\nlapsed more than 90 days ago. Highest priority:\n\n  • 3 patients with prior adenomatous polyps  (interval: 3 yr — overdue 4–7 mo)\n  • 2 patients with family history of CRC     (interval: 5 yr — overdue 3 mo)\n  • 9 average-risk patients                   (interval: 10 yr)\n\nDraft recall letters are ready for front-desk review.',
        cite: '[sources: your scheduling DB · procedure notes 2016–2026 · your surveillance protocol v3]'
      },
      {
        q: 'What did my no-show rate cost the practice last quarter?',
        a: 'Q2 no-show rate was 11.4% (218 slots). At your blended reimbursement of\n$412/visit, that is ≈ $89,800 in unrecovered capacity.\n\nPattern detected: Monday 8–10 AM slots account for 31% of no-shows.\nSuggestion: overbook that window at 1.2× or shift to telehealth confirms.',
        cite: '[sources: your PM system · remittance data · appointment logs]'
      },
      {
        q: 'Which referrals we sent out never got scheduled?',
        a: 'Cross-checking outbound referrals against returned reports… 23 referrals from\nthe last 120 days have no completed-visit record:\n\n  • 9 imaging      (6 past their clinical urgency window)\n  • 8 specialist   (4 to the same practice — worth a phone call)\n  • 6 lab work-ups\n\nA follow-up worklist is queued for your care coordinator, oldest first.',
        cite: '[sources: your referral log · inbound faxes/documents · care-coordination notes]'
      },
      {
        q: 'Which prior authorizations expire in the next two weeks?',
        a: '7 active prior auths lapse within 14 days. 3 belong to patients already\nscheduled AFTER the expiry date:\n\n  • 2 infusion therapies   (renewal takes ~10 business days — start today)\n  • 1 imaging series       (patient scheduled day 16 — move up or renew)\n\nRenewal packets are pre-filled from the original submissions for your review.',
        cite: '[sources: payer portals ledger · your scheduling DB · auth history]'
      },
      {
        q: 'Are we staffed for what next week actually looks like?',
        a: 'Forecast from 3 years of your visit patterns: Tuesday will run ≈ 118% of\ncapacity between 9–11 AM (flu season + 2 providers double-booked), while\nThursday afternoon sits at 61%.\n\nSuggestion: shift one MA from Thursday PM to Tuesday AM, and open 4\nTuesday telehealth slots to absorb the overflow.',
        cite: '[sources: appointment history 2023–2026 · staff schedule · seasonal visit trends]'
      }
    ];
    let idx = 0, playing = false, played = false, skipNow = false;

    termBody.addEventListener('click', () => { skipNow = true; });

    function typeLine(el, text, speed, done) {
      let i = 0;
      skipNow = false;
      const caret = document.createElement('span');
      caret.className = 'caret';
      el.appendChild(caret);
      (function tick() {
        if (skipNow) {
          caret.insertAdjacentText('beforebegin', text.slice(i));
          caret.remove(); done && done(); return;
        }
        if (i < text.length) {
          caret.insertAdjacentText('beforebegin', text[i++]);
          setTimeout(tick, speed + Math.random() * speed);
        } else { caret.remove(); done && done(); }
      })();
    }

    function announce(ex) {
      if (termLive) termLive.textContent =
        'Question: ' + ex.q + ' Answer: ' + ex.a.replace(/\n+/g, ' ') + ' ' + ex.cite;
    }

    function renderInstant(ex) {
      const qEl = document.createElement('div'); qEl.className = 'q'; qEl.textContent = ex.q;
      const aEl = document.createElement('div'); aEl.className = 'a'; aEl.textContent = ex.a;
      const cEl = document.createElement('div'); cEl.className = 'cite'; cEl.textContent = ex.cite;
      termBody.append(qEl, aEl, cEl);
      announce(ex);
    }

    function playExchange(n) {
      if (playing) return;
      playing = true; idx = n;
      const ex = EXCHANGES[n];
      termNext.classList.remove('show');
      if (reduced) {
        renderInstant(ex);
        playing = false;
        termNext.classList.add('show');   // the demonstration loops forever
        return;
      }
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
          announce(ex);
          playing = false;
          termNext.classList.add('show');   // the demonstration loops forever
        }), 420);
      });
    }

    const startTerminal = () => {
      if (played) return;
      played = true;
      setTimeout(() => playExchange(0), 400);
    };
    new IntersectionObserver((entries, obs) => {
      if (entries[0].isIntersecting && !played) { obs.disconnect(); startTerminal(); }
    }, { threshold: 0.05 }).observe(termBody);
    window.__aletheiaStartTerminal = startTerminal;   // the ASK tab starts the show directly

    termNext.addEventListener('click', () => {
      if (playing) return;
      const next = (idx + 1) % EXCHANGES.length;
      if (next === 0) termBody.replaceChildren();      // wrap: a clean slate
      else termBody.appendChild(document.createElement('br'));
      playExchange(next);
    });
  }

  /* ---------- Magnetic buttons (quickTo) ---------- */
  if (!coarse && !reduced) {
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      let rect = null;
      const qx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power2.out' });
      const qy = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power2.out' });
      btn.addEventListener('pointerenter', () => { rect = btn.getBoundingClientRect(); });
      btn.addEventListener('pointermove', (e) => {
        if (!rect) rect = btn.getBoundingClientRect();
        qx((e.clientX - rect.left - rect.width / 2) * 0.28);
        qy((e.clientY - rect.top - rect.height / 2) * 0.34);
      });
      btn.addEventListener('pointerleave', () => {
        rect = null;
        gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
      });
    });
  }

  /* ---------- Custom cursor (compositor-only transforms) ---------- */
  if (!coarse && !reduced) {
    const cur = document.getElementById('cursor');
    document.body.classList.add('cursor-on');
    gsap.set(cur, { xPercent: -50, yPercent: -50 });
    const sx = gsap.quickSetter(cur, 'x', 'px');
    const sy = gsap.quickSetter(cur, 'y', 'px');
    let cx = -100, cy = -100, tx = -100, ty = -100;
    window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    gsap.ticker.add(() => {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      sx(cx); sy(cy);
    });
    document.querySelectorAll('a, button, [data-tilt]').forEach((el) => {
      el.addEventListener('pointerenter', () => cur.classList.add('grow'));
      el.addEventListener('pointerleave', () => cur.classList.remove('grow'));
    });
  }

  /* ---------- Pause cosmetic animations offscreen (battery respect) ---------- */
  {
    const pausables = document.querySelectorAll('.foil');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        en.target.style.animationPlayState = en.isIntersecting ? 'running' : 'paused';
      });
    }, { threshold: 0 });
    pausables.forEach((el) => io.observe(el));
  }

  /* ---------- Easter egg: speak truth's name ---------- */
  {
    const WORD = 'aletheia';
    let buffer = '';
    const heroKicker = document.querySelector('.hero-kicker');
    const footerSeal = document.getElementById('footer-seal');
    window.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!e.key || e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-WORD.length);
      if (buffer !== WORD) return;
      buffer = '';
      const heroVisible = window.scrollY < window.innerHeight * 0.8;
      if (window.__aletheia && !reduced && heroVisible) {
        gsap.to(window.__aletheia, { tealBurst: 1, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: 1 });
        if (heroKicker) {
          const orig = heroKicker.textContent;
          heroKicker.textContent = 'ΑΛΗΘΕΙΑ';
          heroKicker.classList.add('flash');
          setTimeout(() => { heroKicker.textContent = orig; heroKicker.classList.remove('flash'); }, 2200);
        }
      } else if (footerSeal) {
        footerSeal.classList.add('pulse');
        setTimeout(() => footerSeal.classList.remove('pulse'), 3000);
      }
    });
  }

  /* ---------- The coin: flip to read the reverse ---------- */
  {
    const coin = document.getElementById('footer-seal');
    if (coin) {
      const flip = () => {
        const on = coin.classList.toggle('flipped');
        coin.setAttribute('aria-pressed', String(on));
      };
      coin.addEventListener('click', flip);
      coin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
      });
    }
  }

  /* ---------- Zoom-pinned crest: the header seal holds its apparent size.
     Browser zoom moves devicePixelRatio; we counter-scale the mark alone
     (clamped) so the crest stays legible at any zoom level. ---------- */
  {
    const mark = document.querySelector('.brand img');
    if (mark) {
      const baseDPR = window.devicePixelRatio || 1;
      const pin = () => {
        const z = (window.devicePixelRatio || 1) / baseDPR;
        const scale = Math.min(1.6, Math.max(0.6, 1 / z));
        mark.style.transform = scale === 1 ? '' : `scale(${scale})`;
      };
      window.addEventListener('resize', pin);
      pin();
    }
  }

  /* ---------- Vitals: measured live, never merely claimed ---------- */
  {
    const vitals = document.getElementById('vitals');
    if (vitals) {
      let measured = false;
      new IntersectionObserver((entries, obs) => {
        if (!entries[0].isIntersecting || measured) return;
        measured = true; obs.disconnect();

        // page weight + external request count — from the browser's own ledger
        let bytes = 0, ext = 0;
        try {
          const res = performance.getEntriesByType('resource');
          const navE = performance.getEntriesByType('navigation');
          [...res, ...navE].forEach((r) => {
            bytes += r.transferSize || r.decodedBodySize || 0;
            try {
              if (r.name && new URL(r.name).origin !== location.origin) ext++;
            } catch (e) {}
          });
        } catch (e) {}

        // frame rate: sample one second of honest rAF
        let frames = 0;
        const fpsStart = performance.now();
        (function count(now) {
          frames++;
          if (now - fpsStart < 1000) requestAnimationFrame(count);
          else setVal('v-fps', Math.min(Math.round(frames), 120), '');
        })(fpsStart);

        function setVal(id, val, suffix) {
          const el = document.getElementById(id);
          if (!el) return;
          if (reduced) { el.textContent = val + (suffix || ''); return; }
          const o = { v: 0 };
          gsap.to(o, {
            v: val, duration: 1.4, ease: 'power2.out',
            onUpdate: () => { el.textContent = Math.round(o.v) + (suffix || ''); }
          });
        }
        setVal('v-weight', Math.max(1, Math.round(bytes / 1024)), ' KB');
        setVal('v-ext', ext, '');
        const pc = (window.__aletheia && window.__aletheia.count) || 0;
        if (pc) setVal('v-particles', pc, '');
        else { const el = document.getElementById('v-particles'); if (el) el.textContent = 'still edition'; }
      }, { threshold: 0.3 }).observe(vitals);
    }
  }
})();
