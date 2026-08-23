/* ============================================================
   ALETHEIA — "Ask this page" (⌘K)
   A working retrieval demo: the index is built from this page's
   own copy, scored locally, answered with a section citation.
   Nothing leaves. That is the point.
   ============================================================ */
(function () {
  'use strict';

  const palette = document.getElementById('palette');
  const input = document.getElementById('palette-input');
  const results = document.getElementById('palette-results');
  const openBtn = document.getElementById('cmdk-btn');
  if (!palette || !input || !results) return;

  /* ---------- Build the index from the page itself ---------- */
  const INDEX = [];
  document.querySelectorAll('main section, main header').forEach((sec) => {
    const id = sec.id;
    if (!id) return;
    const h = sec.querySelector('h1, h2:not(.sr-only), .sr-only');
    const label = '§' + id.charAt(0).toUpperCase() + id.slice(1);
    sec.querySelectorAll('h1, h2, h3, p, li').forEach((el) => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length < 8) return;
      INDEX.push({ id, label, text, el });
    });
  });

  function score(item, tokens) {
    const hay = item.text.toLowerCase();
    let s = 0;
    for (const t of tokens) {
      if (!t) continue;
      if (hay.includes(t)) s += 2;
      if (hay.startsWith(t)) s += 1;
    }
    // shorter matches surface headings first on ties
    return s > 0 ? s + Math.min(1, 40 / item.text.length) : 0;
  }

  let sel = 0, hits = [];

  function render(q) {
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) {
      // empty query: the page's table of contents
      hits = [];
      const seen = new Set();
      INDEX.forEach((it) => {
        if (seen.has(it.id)) return;
        if (it.el.tagName === 'H1' || it.el.tagName === 'H2') { seen.add(it.id); hits.push(it); }
      });
    } else {
      hits = INDEX.map((it) => ({ it, s: score(it, tokens) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 7)
        .map(x => x.it);
    }
    sel = 0;
    results.innerHTML = '';
    if (!hits.length) {
      const d = document.createElement('div');
      d.className = 'hit';
      d.innerHTML = '<span class="sec-tag">∅</span><span class="txt">Nothing on this page answers that — yet. Write to hello@.</span>';
      results.appendChild(d);
      return;
    }
    hits.forEach((h, i) => {
      const d = document.createElement('div');
      d.className = 'hit' + (i === sel ? ' sel' : '');
      const tag = document.createElement('span'); tag.className = 'sec-tag'; tag.textContent = h.label;
      const tx = document.createElement('span'); tx.className = 'txt';
      tx.textContent = h.text.length > 90 ? h.text.slice(0, 90) + '…' : h.text;
      d.append(tag, tx);
      d.addEventListener('click', () => choose(i));
      d.addEventListener('pointerenter', () => { setSel(i); });
      results.appendChild(d);
    });
  }

  function setSel(i) {
    sel = i;
    [...results.children].forEach((c, j) => c.classList.toggle('sel', j === sel));
  }

  let lastFocus = null;
  function open() {
    lastFocus = document.activeElement;
    palette.classList.add('open');
    input.value = '';
    render('');
    input.focus();
    if (window.__aletheiaLenis) window.__aletheiaLenis.stop();
  }
  function close() {
    palette.classList.remove('open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (window.__aletheiaLenis) window.__aletheiaLenis.start();
  }

  function choose(i) {
    const h = hits[i];
    if (!h) return;
    close();
    const target = document.getElementById(h.id);
    if (!target) return;
    // scroll, then flash the matched element — the beam finds the evidence
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    h.el.classList.remove('flash-target');
    void h.el.offsetWidth;                 // restart animation
    h.el.classList.add('flash-target');
    h.el.setAttribute('tabindex', '-1');
    h.el.focus({ preventScroll: true });
  }

  /* ---------- Events ---------- */
  if (openBtn) openBtn.addEventListener('click', open);
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      palette.classList.contains('open') ? close() : open();
      return;
    }
    if (!palette.classList.contains('open')) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(Math.min(sel + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(Math.max(sel - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
  });
  palette.addEventListener('click', (e) => { if (e.target === palette) close(); });
  input.addEventListener('input', () => render(input.value));
})();
