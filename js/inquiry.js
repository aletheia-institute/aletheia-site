/* ============================================================
   ALETHEIA — Inquiry
   A conversational intake: one question at a time, the way a
   person actually thinks. Everything is composed ON this page;
   pressing send opens the visitor's own mail client addressed
   to inquiry@aletheiainstitute.ai. Nothing transmits silently.
   ============================================================ */
(function () {
  'use strict';

  const body = document.getElementById('inq-body');
  if (!body) return;

  const ADDRESS = 'inquiry@aletheiainstitute.ai';
  const STEPS = [
    { key: 'name', label: 'What should we call you?', type: 'text',
      placeholder: 'Dr. Jane Rivera', required: true },
    { key: 'org', label: 'Your practice or organization?', type: 'text',
      placeholder: 'Riverside Gastroenterology (optional)', required: false },
    { key: 'ask', label: 'What would you like your data to tell you?', type: 'textarea',
      placeholder: 'Where we lose revenue… which patients slip through… what a private AI on our own records could answer…', required: true },
    { key: 'email', label: 'Where can we reach you?', type: 'email',
      placeholder: 'you@yourpractice.com', required: true },
  ];
  const state = {};
  let step = 0;
  let interacted = false;   // never steal page focus before the visitor engages

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s; return d.innerHTML;
  }

  function validate(s, val) {
    if (!s.required) return true;
    if (!val || !val.trim()) return false;
    if (s.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    return true;
  }

  function composed() {
    const org = state.org && state.org.trim() ? state.org.trim() : null;
    const subject = `Inquiry — ${state.name.trim()}${org ? ', ' + org : ''}`;
    const bodyText =
`To The Aletheia Institute,

${state.ask.trim()}

— ${state.name.trim()}${org ? '\n' + org : ''}
Reach me at: ${state.email.trim()}`;
    return { subject, bodyText };
  }

  function dots() {
    return `<div class="inq-dots" aria-hidden="true">` +
      STEPS.map((_, i) =>
        `<span class="inq-dot${i < step ? ' done' : i === step ? ' now' : ''}"></span>`).join('') +
      `</div>`;
  }

  function renderStep() {
    const s = STEPS[step];
    const val = state[s.key] || '';
    const field = s.type === 'textarea'
      ? `<textarea id="inq-field" rows="4" placeholder="${esc(s.placeholder)}">${esc(val)}</textarea>`
      : `<input id="inq-field" type="${s.type}" placeholder="${esc(s.placeholder)}" value="${esc(val)}" autocomplete="${s.key === 'email' ? 'email' : s.key === 'name' ? 'name' : 'organization'}">`;
    body.innerHTML = `
      ${dots()}
      <div class="inq-q"><span class="inq-prompt">❯</span> <label for="inq-field">${esc(s.label)}</label></div>
      ${field}
      <div class="inq-err" id="inq-err" role="alert"></div>
      <div class="inq-nav">
        ${step > 0 ? '<button type="button" class="inq-back" id="inq-back">← BACK</button>' : '<span></span>'}
        <button type="button" class="inq-continue" id="inq-continue">${step === STEPS.length - 1 ? 'REVIEW ▸' : (s.required ? 'CONTINUE ▸' : 'CONTINUE ▸')}</button>
      </div>`;
    const input = document.getElementById('inq-field');
    if (interacted) input.focus();       // autofocus only once the visitor is in the flow
    const advance = () => {
      interacted = true;
      const v = input.value;
      if (!validate(s, v)) {
        document.getElementById('inq-err').textContent =
          s.type === 'email' ? 'A valid address, so we can answer you.' : 'This one we need.';
        input.focus();
        return;
      }
      state[s.key] = v;
      step += 1;
      step < STEPS.length ? renderStep() : renderReview();
    };
    document.getElementById('inq-continue').addEventListener('click', advance);
    if (step > 0) document.getElementById('inq-back').addEventListener('click', () => {
      state[s.key] = input.value; step -= 1; renderStep();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (s.type !== 'textarea' || e.metaKey || e.ctrlKey)) {
        e.preventDefault(); advance();
      }
    });
  }

  function renderReview() {
    const { subject, bodyText } = composed();
    const href = `mailto:${ADDRESS}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    body.innerHTML = `
      ${dots()}
      <div class="inq-q"><span class="inq-prompt">❯</span> <span>Your inquiry, sealed and ready:</span></div>
      <pre class="inq-review">${esc('To:      ' + ADDRESS + '\nSubject: ' + subject + '\n\n' + bodyText)}</pre>
      <div class="inq-nav">
        <button type="button" class="inq-back" id="inq-back">← EDIT</button>
        <span class="inq-actions">
          <button type="button" class="inq-copy" id="inq-copy">COPY</button>
          <a class="btn btn-gold inq-send" id="inq-send" href="${href}">Seal &amp; Send</a>
        </span>
      </div>`;
    document.getElementById('inq-back').addEventListener('click', () => { step = STEPS.length - 1; renderStep(); });
    document.getElementById('inq-copy').addEventListener('click', async (e) => {
      const text = `To: ${ADDRESS}\nSubject: ${subject}\n\n${bodyText}`;
      try { await navigator.clipboard.writeText(text); } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e2) {}
        ta.remove();
      }
      e.target.textContent = 'COPIED ✓';
      setTimeout(() => { const b = document.getElementById('inq-copy'); if (b) b.textContent = 'COPY'; }, 2200);
    });
  }

  renderStep();
})();
