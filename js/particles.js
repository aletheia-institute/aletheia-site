/* ============================================================
   ALETHEIA — the constellation, act structure
   One organism of up to ~17,000 motes narrates the whole page:
     hero        — the full seal, engraved at fidelity
     manifesto   — ΑΛΗΘΕΙΑ, the word behind the words
     services    — the numerals I · II take their posts
     method      — the sunburst turns, an instrument at work
     demo        — a data-stream pours into the terminal
     principles  — the trinity Α Φ Σ stands guard
     inquiry     — the word returns, sealed small
   Scene targets rasterize at runtime from the site's own type;
   the spring field morphs the swarm between scenes. Positions
   stream to the GPU; everything else lives in static attributes
   and uniforms. Raw WebGL. Zero external requests.
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('constellation');
  if (!canvas) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { canvas.remove(); return; }

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; }

  /* ---------- Capability budget (review: no unbounded desktop tier) ---------- */
  const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  const lowTier = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const BUDGET = isMobile ? 5200 : (lowTier ? 10000 : 36000);

  /* ---------- The seal cloud: COLOR-ACCURATE ----------
     Every point carries the true color of the pixel it came from.
     Artwork points first (full presence), then the field (a breath quieter). */
  function sealCloud() {
    const cloud = window.__ALETHEIA_EMBLEM;
    const color = window.__ALETHEIA_EMBLEM_COLOR;
    const artCount = window.__ALETHEIA_EMBLEM_ART || 0;
    if (cloud && color && cloud.length >= 4 && cloud.length % 2 === 0) {
      const total = cloud.length / 2;
      const step = Math.max(1, Math.ceil(total / BUDGET));
      const pts = [], cols = [], ascale = [];
      for (let i = 0; i + 1 < cloud.length; i += 2 * step) {
        const j = i / 2;
        pts.push(cloud[i], cloud[i + 1]);
        cols.push(color[j*3], color[j*3+1], color[j*3+2]);
        ascale.push(j < artCount ? 1.0 : 0.55);
      }
      return { pts, cols, ascale, art: Math.ceil(artCount / step) };
    }
    const pts = [], cols = [], ascale = [];           // last-resort ring
    for (let i = 0; i < 900; i++) {
      const a = (i / 900) * Math.PI * 2;
      pts.push(Math.cos(a) * 0.94, Math.sin(a) * 0.94);
      cols.push(0.725, 0.584, 0.286);
      ascale.push(1.0);
    }
    return { pts, cols, ascale, art: 900 };
  }

  const CLOUD = sealCloud();
  const SEAL = CLOUD.pts;
  const EMB = SEAL.length / 2;
  // measured bounds — the fit math derives from data, never from a literal
  let sxMin = 1e9, sxMax = -1e9, syMin = 1e9, syMax = -1e9;
  for (let i = 0; i + 1 < SEAL.length; i += 2) {
    if (SEAL[i] < sxMin) sxMin = SEAL[i];
    if (SEAL[i] > sxMax) sxMax = SEAL[i];
    if (SEAL[i+1] < syMin) syMin = SEAL[i+1];
    if (SEAL[i+1] > syMax) syMax = SEAL[i+1];
  }
  const AMBIENT = isMobile ? 220 : 650;
  const COUNT = EMB + AMBIENT;

  const P = new Float32Array(COUNT * 2);              // positions (streamed)
  const V = new Float32Array(COUNT * 2);
  const T = new Float32Array(COUNT * 2);
  const RAND = new Float32Array(COUNT * 4);           // phase, speed, cloudX, cloudY
  const SIZE = new Float32Array(COUNT);               // base size variance (static)
  const STATIC = new Float32Array(COUNT * 9);         // size, phase, speed, kind, tint, ascale, r, g, b

  let W = 0, H = 0, DPR = 1;

  for (let i = 0; i < COUNT; i++) {
    const isEmblem = i < EMB;
    RAND[i*4]   = Math.random() * Math.PI * 2;
    RAND[i*4+1] = 0.5 + Math.random();
    RAND[i*4+2] = Math.random();
    RAND[i*4+3] = Math.random();
    // figure over ground: artwork motes larger, field motes finer
    const classMul = isEmblem ? (CLOUD.ascale[i] >= 1.0 ? 1.32 : 0.6) : 1.0;
    SIZE[i] = (isEmblem ? 0.55 + Math.random() * 0.5 : 0.45 + Math.random() * 0.7) * classMul;
    STATIC[i*9]   = SIZE[i];
    STATIC[i*9+1] = RAND[i*4];
    STATIC[i*9+2] = RAND[i*4+1];
    STATIC[i*9+3] = isEmblem ? 1 : 0;
    STATIC[i*9+4] = Math.random() < 0.04 ? 1 : 0;     // teal seeds await the word
    STATIC[i*9+5] = isEmblem ? CLOUD.ascale[i] : 1.0;
    if (isEmblem) {
      STATIC[i*9+6] = CLOUD.cols[i*3];
      STATIC[i*9+7] = CLOUD.cols[i*3+1];
      STATIC[i*9+8] = CLOUD.cols[i*3+2];
    } else {                                          // ambient dust: quiet livery mix
      const m = Math.random() < 0.5;
      STATIC[i*9+6] = m ? 0.478 : 0.043;
      STATIC[i*9+7] = m ? 0.369 : 0.122;
      STATIC[i*9+8] = m ? 0.165 : 0.200;
    }
  }

  /* ---------- Scene target generators (viewport px) ---------- */
  function navHeight() {
    const nav = document.getElementById('nav');       // measured, never hardcoded
    return nav ? nav.getBoundingClientRect().height : 104;
  }

  function sealScene() {
    const PAD = 26, HINT = 92;                        // bottom reserve: the descent glyph
    const navH = navHeight();
    const spanY = Math.max(0.5, syMax - syMin);
    let scale = Math.min(Math.min(W, H) * 0.44, (H - navH - PAD - HINT) / spanY);
    scale = Math.max(scale, 40);                      // short viewports: shrink, never mirror
    const pinned = navH + PAD - syMin * scale;        // top edge clears the nav band
    const centered = H * 0.48 - ((syMin + syMax) / 2) * scale;
    const cy = Math.max(pinned, centered);            // tall viewports: sit with the headline
    const cx = W / 2;
    const pts = new Float32Array(SEAL.length);
    for (let i = 0; i + 1 < SEAL.length; i += 2) {
      pts[i] = cx + SEAL[i] * scale;
      pts[i+1] = cy + SEAL[i+1] * scale;
    }
    return pts;
  }

  // rasterize the site's own type / drawings into targets
  function sample(draw) {
    const c = document.createElement('canvas');
    c.width = Math.max(2, W >> 1); c.height = Math.max(2, H >> 1);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.scale(0.5, 0.5);
    x.fillStyle = '#000'; x.strokeStyle = '#000';
    draw(x, W, H);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const pts = [];
    const step = isMobile ? 2 : 1;
    for (let yy = 0; yy < c.height; yy += step)
      for (let xx = 0; xx < c.width; xx += step)
        if (d[(yy * c.width + xx) * 4 + 3] > 100) pts.push(xx * 2, yy * 2);
    return Float32Array.from(pts);
  }

  const SERIF = '"Fraunces", Georgia, serif';
  const text = (str, sizePx, yFrac) => sample((x, w, h) => {
    x.font = `600 ${sizePx}px ${SERIF}`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(str, w / 2, h * yFrac);
  });

  function sunburstScene() {
    return sample((x, w, h) => {
      const cx = w / 2, cy = h * 0.5, R = Math.min(w, h) * 0.34;
      x.lineWidth = 10;
      x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 7;
      x.beginPath(); x.arc(cx, cy, R * 0.42, 0, Math.PI * 2); x.stroke();
      for (let r = 0; r < 13; r++) {
        const a = (r / 13) * Math.PI * 2;
        const inner = R * 0.5, outer = r % 2 ? R * 0.72 : R * 0.9;
        x.lineWidth = r % 2 ? 6 : 9;
        x.beginPath();
        x.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        x.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
        x.stroke();
      }
    });
  }

  function streamScene() {
    // rivers of data pouring toward the terminal's mouth
    const pts = [];
    const tx = W / 2, ty = H * 0.46;
    const springs = [[0, H*0.1], [W, H*0.08], [0, H*0.75], [W, H*0.8], [W*0.15, 0], [W*0.85, 0]];
    for (const [sx0, sy0] of springs) {
      const mx0 = (sx0 + tx) / 2 + (sy0 < ty ? 1 : -1) * W * 0.08;
      const my0 = (sy0 + ty) / 2 + (sx0 < tx ? -1 : 1) * H * 0.10;
      for (let i = 0; i <= 140; i++) {
        const t = i / 140, u = 1 - t;
        const px = u*u*sx0 + 2*u*t*mx0 + t*t*tx;
        const py = u*u*sy0 + 2*u*t*my0 + t*t*ty;
        const jitter = 26 * u;                        // streams tighten as they arrive
        pts.push(px + (Math.random()-0.5)*jitter, py + (Math.random()-0.5)*jitter);
      }
    }
    const mouth = text('❯', Math.min(W, H) * 0.12, 0.46);
    const out = new Float32Array(pts.length + mouth.length);
    out.set(pts); out.set(mouth, pts.length);
    return out;
  }

  const SCENES = [
    { sel: '#hero',       gen: sealScene,                                         alpha: 1.00, size: 1.00 },
    { sel: '#manifesto',  gen: () => text('ΑΛΗΘΕΙΑ', Math.min(W,H) * 0.24, 0.5),  alpha: 0.55, size: 0.90 },
    { sel: '#services',   gen: () => sample((x,w,h) => {
        x.font = `600 ${Math.min(w,h)*0.3}px ${SERIF}`;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('I', w*0.26, h*0.5); x.fillText('II', w*0.74, h*0.5);
      }),                                                                         alpha: 0.60, size: 0.95 },
    { sel: '#method',     gen: sunburstScene, rotate: 0.10,                       alpha: 0.65, size: 0.95 },
    { sel: '#demo',       gen: streamScene,                                       alpha: 0.60, size: 0.90 },
    { sel: '#principles', gen: () => sample((x,w,h) => {
        x.font = `600 ${Math.min(w,h)*0.26}px ${SERIF}`;
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('Α', w*0.2, h*0.5); x.fillText('Φ', w*0.5, h*0.5); x.fillText('Σ', w*0.8, h*0.5);
      }),                                                                         alpha: 0.60, size: 0.95 },
    { sel: '#contact',    gen: () => text('ΑΛΗΘΕΙΑ', Math.min(W,H) * 0.11, 0.4),  alpha: 0.50, size: 0.85 },
  ];
  let sceneEls = [];
  let sceneIdx = -1;
  let sceneCache = [];
  let sceneTheta = 0;
  let alphaMul = 1, sizeMul = 1, alphaMulT = 1, sizeMulT = 1;

  function activate(k, kick) {
    const sc = SCENES[k];
    sceneIdx = k;
    const targets = sceneCache[k] || (sceneCache[k] = sc.gen());
    sceneTheta = 0;
    alphaMulT = sc.alpha; sizeMulT = sc.size;
    const n = targets.length / 2;
    if (!n) return;
    for (let i = 0; i < EMB; i++) {
      const idx = (i * 7919 + ((i * 104729) % 31)) % n;
      T[i*2]   = targets[idx*2];
      T[i*2+1] = targets[idx*2+1];
      if (kick) { V[i*2] += (Math.random()-0.5) * 16; V[i*2+1] += (Math.random()-0.5) * 16; }
    }
  }

  function pickScene() {
    const mid = H * 0.5;
    for (let k = sceneEls.length - 1; k >= 0; k--) {
      const el = sceneEls[k];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) return k;
    }
    return sceneIdx < 0 ? 0 : sceneIdx;
  }

  /* ---------- GL: positions stream; character is static ---------- */
  const vsrc = `
    attribute vec2 a_pos;
    attribute float a_size;
    attribute float a_phase;
    attribute float a_speed;
    attribute float a_kind;      // 1 emblem, 0 ambient dust
    attribute float a_tint;
    attribute float a_ascale;    // artwork full, field a breath quieter
    attribute vec3 a_col;        // the pixel's true color
    uniform vec2 u_res;
    uniform float u_dpr;
    uniform float u_time;
    uniform float u_asm;
    uniform float u_alphaMul;
    uniform float u_sizeMul;
    varying float v_alpha;
    varying float v_tint;
    varying vec3 v_color;
    void main() {
      vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      float twinkle = 0.72 + 0.28 * sin(u_time * a_speed * 2.1 + a_phase * 3.0);
      float embSize = (2.9 + a_size * 2.9) * u_sizeMul;
      float ambSize = (4.8 + a_size * 5.6) * 0.72;
      gl_PointSize = mix(ambSize, embSize, a_kind) * u_dpr;
      float embA = (0.62 + 0.38 * twinkle) * u_asm * u_alphaMul;   // a medallion, not a watermark
      float ambA = (0.06 + 0.11 * twinkle) * u_asm;
      v_alpha = mix(ambA, embA * a_ascale, a_kind);
      v_tint = a_tint;
      v_color = a_col;
    }`;
  const fsrc = `
    precision mediump float;
    varying float v_alpha;
    varying float v_tint;
    varying vec3 v_color;
    uniform float u_teal;
    void main() {
      vec2 d = gl_PointCoord - 0.5;
      float r = length(d);
      float glow = smoothstep(0.5, 0.0, r);
      glow *= glow;
      vec3 teal = vec3(0.078, 0.396, 0.357);       // Verity Teal, daylight cut
      vec3 col = mix(v_color, teal, v_tint * u_teal);   // the pixel's own color, always
      gl_FragColor = vec4(col, glow * v_alpha * (1.0 + v_tint * u_teal * 0.6));
    }`;

  let uRes, uDpr, uTime, uAsm, uAlphaMul, uSizeMul, uTeal, dynVbo, lost = false;

  function initGL() {
    function sh(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    }
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vsrc));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fsrc));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
    } catch (e) {
      console.error('constellation shader failed:', e && e.message);   // loud — the suite hears this
      canvas.remove(); return false;
    }
    gl.useProgram(prog);
    uRes = gl.getUniformLocation(prog, 'u_res');
    uDpr = gl.getUniformLocation(prog, 'u_dpr');
    uTime = gl.getUniformLocation(prog, 'u_time');
    uAsm = gl.getUniformLocation(prog, 'u_asm');
    uAlphaMul = gl.getUniformLocation(prog, 'u_alphaMul');
    uSizeMul = gl.getUniformLocation(prog, 'u_sizeMul');
    uTeal = gl.getUniformLocation(prog, 'u_teal');

    // static character buffer: written once, never re-uploaded
    const statVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, statVbo);
    gl.bufferData(gl.ARRAY_BUFFER, STATIC, gl.STATIC_DRAW);
    const bind1 = (name, offset) => {
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, 36, offset);
    };
    bind1('a_size', 0); bind1('a_phase', 4); bind1('a_speed', 8);
    bind1('a_kind', 12); bind1('a_tint', 16); bind1('a_ascale', 20);
    const colLoc = gl.getAttribLocation(prog, 'a_col');
    gl.enableVertexAttribArray(colLoc);
    gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 36, 24);

    // dynamic position buffer: the only per-frame upload (8 bytes/particle)
    dynVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dynVbo);
    gl.bufferData(gl.ARRAY_BUFFER, P.byteLength, gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 8, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    return true;
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { if (initGL()) lost = false; });
  if (!initGL()) return;

  /* ---------- Layout / interaction ---------- */
  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === W && h === H) return;                   // URL-bar jitter: nothing to do
    W = w; H = h;
    canvas.width = W * DPR; canvas.height = H * DPR;
    if (!lost) gl.viewport(0, 0, canvas.width, canvas.height);
    sceneCache = [];                                  // viewport changed: re-rasterize
    for (let i = EMB; i < COUNT; i++) {
      T[i*2] = RAND[i*4+2] * W;
      T[i*2+1] = RAND[i*4+3] * H;
    }
    if (sceneIdx >= 0) activate(sceneIdx, false);
  }

  function scatter() {
    for (let i = 0; i < COUNT; i++) {
      P[i*2] = Math.random() * W;
      P[i*2+1] = Math.random() * H;
      V[i*2] = V[i*2+1] = 0;
    }
  }

  let mx = -9999, my = -9999, parX = 0, parY = 0;
  window.addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;                    // fixed canvas: viewport coords
    parX = (e.clientX / (window.innerWidth || 1) - 0.5);
    parY = (e.clientY / (window.innerHeight || 1) - 0.5);
  }, { passive: true });

  window.__aletheia = { disperse: 0, assemble: 0, tealBurst: 0, count: COUNT };

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 150); });
  window.addEventListener('load', () => {
    layout();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { sceneCache = []; if (sceneIdx >= 0) activate(sceneIdx, false); });
    }
  });

  /* ---------- Simulation: positions only; the GPU owns the rest ---------- */
  let last = performance.now();
  let sceneCheck = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running || lost) { last = now; return; }
    const dt = Math.min((now - last) / 16.666, 2.2); last = now;
    const t = now * 0.001;

    if (!sceneEls.length) sceneEls = SCENES.map(s => document.querySelector(s.sel));
    if (now - sceneCheck > 180) {
      sceneCheck = now;
      const k = pickScene();
      if (k !== sceneIdx) activate(k, true);
    }
    const sc = SCENES[sceneIdx] || SCENES[0];
    if (sc.rotate) sceneTheta += sc.rotate * dt / 60;
    alphaMul += (alphaMulT - alphaMul) * 0.04;
    sizeMul += (sizeMulT - sizeMul) * 0.04;

    const st = window.__aletheia;
    const spring = 0.055 * st.assemble;
    const damp = 0.86;
    const mR = 130, mR2 = mR * mR;
    const ox = parX * 26, oy = parY * 18;
    const cosT = Math.cos(sceneTheta), sinT = Math.sin(sceneTheta);
    const scx = W / 2, scy = H / 2;
    const rot = !!sc.rotate;

    for (let i = 0; i < COUNT; i++) {
      const i2 = i * 2, i4 = i * 4;
      const isEmblem = i < EMB;
      let tx = T[i2], ty = T[i2 + 1];
      if (isEmblem) {
        if (rot) {
          const dx0 = tx - scx, dy0 = ty - scy;
          tx = scx + dx0 * cosT - dy0 * sinT;
          ty = scy + dx0 * sinT + dy0 * cosT;
        }
        tx += ox; ty += oy;
      }
      const ph = RAND[i4], spd = RAND[i4+1];
      tx += Math.sin(t * spd + ph) * (isEmblem ? 2.2 : 18);
      ty += Math.cos(t * spd * 0.9 + ph * 1.7) * (isEmblem ? 2.2 : 15);

      V[i2]   = (V[i2]   + (tx - P[i2])   * (isEmblem ? spring : 0.012) * dt) * damp;
      V[i2+1] = (V[i2+1] + (ty - P[i2+1]) * (isEmblem ? spring : 0.012) * dt) * damp;

      const dx = P[i2] - mx, dy = P[i2+1] - my;
      const d2 = dx * dx + dy * dy;
      if (d2 < mR2 && d2 > 0.01) {
        const inv = 1 / Math.sqrt(d2);
        const f = (1 - 1 / (inv * mR)) * 2.4;
        V[i2] += dx * inv * f;
        V[i2+1] += dy * inv * f;
      }

      P[i2] += V[i2] * dt; P[i2+1] += V[i2+1] * dt;
    }

    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uDpr, DPR);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uAsm, st.assemble);
    gl.uniform1f(uAlphaMul, alphaMul);
    gl.uniform1f(uSizeMul, sizeMul);
    gl.uniform1f(uTeal, st.tealBurst);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, P);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  }

  layout(); scatter(); activate(0, false);
  requestAnimationFrame(frame);
})();
