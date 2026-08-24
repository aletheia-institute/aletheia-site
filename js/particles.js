/* ============================================================
   ALETHEIA — the seal constellation (hero only)
   ~20,000 Aletheia-Midnight motes assemble the seal's artwork
   on the first screen, and disperse to nothing as you scroll
   past. Below the fold the canvas draws nothing; the page's
   background story belongs to the strata parallax.
   Positions stream to the GPU; character is static.
   Raw WebGL. Zero external requests.
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('constellation');
  if (!canvas) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { canvas.remove(); return; }

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; }

  /* ---------- Capability budget ---------- */
  const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  const lowTier = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  const BUDGET = isMobile ? 5200 : (lowTier ? 10000 : 36000);

  /* ---------- The seal cloud (packed, Aletheia Midnight) ---------- */
  function sealCloud() {
    const cloud = window.__ALETHEIA_EMBLEM;
    const color = window.__ALETHEIA_EMBLEM_COLOR;
    if (cloud && color && cloud.length >= 4 && cloud.length % 2 === 0) {
      const total = cloud.length / 2;
      const step = Math.max(1, Math.ceil(total / BUDGET));
      const pts = [], cols = [];
      for (let i = 0; i + 1 < cloud.length; i += 2 * step) {
        const j = i / 2;
        pts.push(cloud[i], cloud[i + 1]);
        cols.push(color[j*3], color[j*3+1], color[j*3+2]);
      }
      return { pts, cols };
    }
    const pts = [], cols = [];                        // last-resort ring
    for (let i = 0; i < 900; i++) {
      const a = (i / 900) * Math.PI * 2;
      pts.push(Math.cos(a) * 0.94, Math.sin(a) * 0.94);
      cols.push(0.043, 0.122, 0.200);
    }
    return { pts, cols };
  }

  const CLOUD = sealCloud();
  const SEAL = CLOUD.pts;
  const EMB = SEAL.length / 2;
  // measured bounds — fit math derives from data, never a literal
  let syMin = 1e9, syMax = -1e9;
  for (let i = 1; i < SEAL.length; i += 2) {
    if (SEAL[i] < syMin) syMin = SEAL[i];
    if (SEAL[i] > syMax) syMax = SEAL[i];
  }
  const AMBIENT = isMobile ? 220 : 650;
  const COUNT = EMB + AMBIENT;

  const P = new Float32Array(COUNT * 2);              // positions (streamed)
  const V = new Float32Array(COUNT * 2);
  const T = new Float32Array(COUNT * 2);
  const RAND = new Float32Array(COUNT * 4);           // phase, speed, cloudX, cloudY
  const STATIC = new Float32Array(COUNT * 8);         // size, phase, speed, kind, tint, r, g, b

  let W = 0, H = 0, DPR = 1;

  for (let i = 0; i < COUNT; i++) {
    const isEmblem = i < EMB;
    RAND[i*4]   = Math.random() * Math.PI * 2;
    RAND[i*4+1] = 0.5 + Math.random();
    RAND[i*4+2] = Math.random();
    RAND[i*4+3] = Math.random();
    STATIC[i*8]   = (isEmblem ? 0.55 + Math.random() * 0.5 : 0.45 + Math.random() * 0.7)
                    * (isEmblem ? 1.32 : 1.0);
    STATIC[i*8+1] = RAND[i*4];
    STATIC[i*8+2] = RAND[i*4+1];
    STATIC[i*8+3] = isEmblem ? 1 : 0;
    STATIC[i*8+4] = Math.random() < 0.04 ? 1 : 0;     // teal seeds await the word
    if (isEmblem) {
      STATIC[i*8+5] = CLOUD.cols[i*3];
      STATIC[i*8+6] = CLOUD.cols[i*3+1];
      STATIC[i*8+7] = CLOUD.cols[i*3+2];
    } else {                                          // ambient dust: quiet livery mix
      const m = Math.random() < 0.5;
      STATIC[i*8+5] = m ? 0.478 : 0.043;
      STATIC[i*8+6] = m ? 0.369 : 0.122;
      STATIC[i*8+7] = m ? 0.165 : 0.200;
    }
  }

  /* ---------- The seal's place on the first screen ---------- */
  function navHeight() {
    const nav = document.getElementById('nav');       // measured, never hardcoded
    return nav ? nav.getBoundingClientRect().height : 104;
  }

  function setSealTargets() {
    const PAD = 26, HINT = 92;                        // bottom reserve: the descent glyph
    const navH = navHeight();
    const spanY = Math.max(0.5, syMax - syMin);
    let scale = Math.min(Math.min(W, H) * 0.44, (H - navH - PAD - HINT) / spanY);
    scale = Math.max(scale, 40);                      // short viewports: shrink, never mirror
    const pinned = navH + PAD - syMin * scale;
    const centered = H * 0.48 - ((syMin + syMax) / 2) * scale;
    const cy = Math.max(pinned, centered);
    const cx = W / 2;
    for (let i = 0; i + 1 < SEAL.length; i += 2) {
      T[i] = cx + SEAL[i] * scale;
      T[i+1] = cy + SEAL[i+1] * scale;
    }
  }

  /* ---------- GL: positions stream; character is static ---------- */
  const vsrc = `
    attribute vec2 a_pos;
    attribute float a_size;
    attribute float a_phase;
    attribute float a_speed;
    attribute float a_kind;      // 1 emblem, 0 ambient dust
    attribute float a_tint;
    attribute vec3 a_col;
    uniform vec2 u_res;
    uniform float u_dpr;
    uniform float u_time;
    uniform float u_asm;
    uniform float u_dis;
    varying float v_alpha;
    varying float v_tint;
    varying vec3 v_color;
    void main() {
      vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      float twinkle = 0.72 + 0.28 * sin(u_time * a_speed * 2.1 + a_phase * 3.0);
      float embSize = 2.9 + a_size * 2.9;
      float ambSize = (4.8 + a_size * 5.6) * 0.72;
      gl_PointSize = mix(ambSize, embSize, a_kind) * u_dpr;
      float embA = (0.62 + 0.38 * twinkle) * u_asm * (1.0 - u_dis);
      float ambA = (0.06 + 0.11 * twinkle) * u_asm * (1.0 - u_dis * 0.55);
      v_alpha = mix(ambA, embA, a_kind);
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
      vec3 teal = vec3(0.078, 0.396, 0.357);
      vec3 col = mix(v_color, teal, v_tint * u_teal);
      gl_FragColor = vec4(col, glow * v_alpha * (1.0 + v_tint * u_teal * 0.6));
    }`;

  let uRes, uDpr, uTime, uAsm, uDis, uTeal, dynVbo, lost = false;

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
    uDis = gl.getUniformLocation(prog, 'u_dis');
    uTeal = gl.getUniformLocation(prog, 'u_teal');

    const statVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, statVbo);
    gl.bufferData(gl.ARRAY_BUFFER, STATIC, gl.STATIC_DRAW);
    const bind1 = (name, offset) => {
      const loc = gl.getAttribLocation(prog, name);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 1, gl.FLOAT, false, 32, offset);
    };
    bind1('a_size', 0); bind1('a_phase', 4); bind1('a_speed', 8);
    bind1('a_kind', 12); bind1('a_tint', 16);
    const colLoc = gl.getAttribLocation(prog, 'a_col');
    gl.enableVertexAttribArray(colLoc);
    gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 32, 20);

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
    if (w === W && h === H) return;
    W = w; H = h;
    canvas.width = W * DPR; canvas.height = H * DPR;
    if (!lost) gl.viewport(0, 0, canvas.width, canvas.height);
    for (let i = EMB; i < COUNT; i++) {
      T[i*2] = RAND[i*4+2] * W;
      T[i*2+1] = RAND[i*4+3] * H;
    }
    setSealTargets();
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
    mx = e.clientX; my = e.clientY;
    parX = (e.clientX / (window.innerWidth || 1) - 0.5);
    parY = (e.clientY / (window.innerHeight || 1) - 0.5);
  }, { passive: true });

  window.__aletheia = { disperse: 0, assemble: 0, tealBurst: 0, count: COUNT };

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 150); });
  window.addEventListener('load', layout);

  /* ---------- Simulation: the hero act, and only the hero act ---------- */
  let last = performance.now();
  let cleared = false;
  function frame(now) {
    requestAnimationFrame(frame);
    const st = window.__aletheia;
    // fully dispersed below the fold: clear once, then idle — the strata take over
    if (!running || lost || st.disperse >= 0.999) {
      if (!cleared && !lost) { gl.clear(gl.COLOR_BUFFER_BIT); cleared = true; }
      last = now; return;
    }
    cleared = false;
    const dt = Math.min((now - last) / 16.666, 2.2); last = now;
    const t = now * 0.001;

    const asm = st.assemble;
    const dis = st.disperse;
    const spring = 0.055 * asm * (1 - dis * 0.92);
    const damp = 0.86;
    const mR = 130, mR2 = mR * mR;
    const ox = parX * 26, oy = parY * 18;

    for (let i = 0; i < COUNT; i++) {
      const i2 = i * 2, i4 = i * 4;
      const isEmblem = i < EMB;
      let tx = T[i2], ty = T[i2 + 1];
      if (isEmblem) {
        tx += ox; ty += oy;
        if (dis > 0) {                                // dissolve toward each mote's cloud point
          tx += (RAND[i4+2] * W - tx) * dis;
          ty += (RAND[i4+3] * H - H * 0.25 - ty) * dis;
        }
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
    gl.uniform1f(uAsm, asm);
    gl.uniform1f(uDis, dis);
    gl.uniform1f(uTeal, st.tealBurst);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, P);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  }

  layout(); scatter();
  requestAnimationFrame(frame);
})();
