/* ============================================================
   ALETHEIA — hero constellation
   ~3,500 gold particles coalesce from noise into the seal's
   sunburst-and-open-book emblem. Raw WebGL, zero dependencies.
   Handles context loss/restore; hidden teal channel awaits
   those who speak truth's name.
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('constellation');
  if (!canvas) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { canvas.remove(); return; }

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) { canvas.remove(); return; }

  const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;

  /* ---------- Emblem geometry (normalized, centered, r≈1) ---------- */
  function buildTargets() {
    const pts = [];
    const push = (x, y, s, tint) => pts.push({ x, y, s: s || 1, tint: tint || 0 });

    // Outer ring
    const N1 = isMobile ? 160 : 340;
    for (let i = 0; i < N1; i++) {
      const a = (i / N1) * Math.PI * 2;
      push(Math.cos(a) * 0.94, Math.sin(a) * 0.94, 0.8);
    }
    // Inner ring
    const N2 = isMobile ? 110 : 230;
    for (let i = 0; i < N2; i++) {
      const a = (i / N2) * Math.PI * 2;
      push(Math.cos(a) * 0.64, Math.sin(a) * 0.64, 0.7);
    }
    // Sunburst rays — upper arc, alternating long/short; tips carry the teal seed
    const rays = 13;
    for (let r = 0; r < rays; r++) {
      const frac = r / (rays - 1);
      const ang = (-160 + frac * 140) * Math.PI / 180;
      const inner = 0.15, outer = r % 2 === 0 ? 0.40 : 0.30;
      const n = isMobile ? 10 : 20;
      for (let i = 0; i <= n; i++) {
        const t = inner + (outer - inner) * (i / n);
        push(Math.cos(ang) * t, Math.sin(ang) * t - 0.06, 1.15, i === n ? 1 : 0);
      }
    }
    // Sun half-disc (filled fan above book)
    const fanRows = isMobile ? 4 : 7;
    for (let row = 0; row <= fanRows; row++) {
      const rr = 0.115 * (row / fanRows);
      const n = Math.max(3, Math.round(14 * (row / fanRows)));
      for (let i = 0; i <= n; i++) {
        const a = Math.PI + (i / n) * Math.PI;
        push(Math.cos(a) * rr, Math.sin(a) * rr - 0.06, 1.3);
      }
    }
    // Open book — two mirrored curved panels below the sun
    const bezier = (p0, p1, p2, p3, t) => {
      const u = 1 - t;
      return [
        u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
        u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1]
      ];
    };
    const bookTopL = [[0, 0.10], [-0.13, 0.04], [-0.28, 0.04], [-0.38, 0.08]];
    const bookBotL = [[-0.38, 0.30], [-0.28, 0.26], [-0.13, 0.26], [0, 0.32]];
    const nB = isMobile ? 16 : 30;
    for (const flip of [1, -1]) {
      for (let i = 0; i <= nB; i++) {
        const t = i / nB;
        const [x1, y1] = bezier(...bookTopL, t); push(x1 * -flip, y1, 1.0);
        const [x2, y2] = bezier(...bookBotL, t); push(x2 * -flip, y2, 1.0);
      }
      const nE = isMobile ? 6 : 12;
      for (let i = 0; i <= nE; i++) {
        push(0, 0.10 + (0.32 - 0.10) * (i / nE), 0.9);
        push(-0.38 * -flip, 0.08 + (0.30 - 0.08) * (i / nE), 0.9);
      }
      for (let ln = 0; ln < 3; ln++) {
        const y = 0.145 + ln * 0.05;
        const n = isMobile ? 5 : 9;
        for (let i = 0; i <= n; i++) {
          const x = (0.06 + (0.30 - 0.06) * (i / n)) * -flip;
          push(x, y + (i / n) * 0.012, 0.65);
        }
      }
    }
    return pts;
  }

  /* ---------- Particles ---------- */
  const targets = buildTargets();
  const AMBIENT = isMobile ? 260 : 700;
  const COUNT = targets.length + AMBIENT;
  const STRIDE = 5;                                   // x, y, size, alpha, tint
  const P = new Float32Array(COUNT * 2);
  const V = new Float32Array(COUNT * 2);
  const T = new Float32Array(COUNT * 2);
  const RAND = new Float32Array(COUNT * 4);           // phase, speed, cloudX, cloudY
  const META = new Float32Array(COUNT * 2);           // baseSize, tint
  const buf = new Float32Array(COUNT * STRIDE);

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, scale = 1;

  for (let i = 0; i < COUNT; i++) {
    RAND[i*4]   = Math.random() * Math.PI * 2;
    RAND[i*4+1] = 0.5 + Math.random();
    RAND[i*4+2] = Math.random();
    RAND[i*4+3] = Math.random();
    if (i < targets.length) {
      META[i*2]   = targets[i].s * (0.8 + Math.random() * 0.5);
      META[i*2+1] = targets[i].tint === 1 ? 1 : (Math.random() < 0.04 ? 1 : 0);
    } else {
      META[i*2]   = 0.45 + Math.random() * 0.7;
      META[i*2+1] = Math.random() < 0.06 ? 1 : 0;
    }
  }

  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    if (!lost) gl.viewport(0, 0, canvas.width, canvas.height);
    cx = W / 2; cy = H * 0.44;
    scale = Math.min(W, H) * 0.36;
    for (let i = 0; i < COUNT; i++) {
      if (i < targets.length) {
        T[i*2]   = cx + targets[i].x * scale;
        T[i*2+1] = cy + targets[i].y * scale;
      } else {
        T[i*2]   = RAND[i*4+2] * W;
        T[i*2+1] = RAND[i*4+3] * H;
      }
    }
  }

  function scatter() {
    for (let i = 0; i < COUNT; i++) {
      P[i*2]   = Math.random() * W;
      P[i*2+1] = Math.random() * H;
      V[i*2] = V[i*2+1] = 0;
    }
  }

  /* ---------- GL program (re-runnable for context restore) ---------- */
  const vsrc = `
    attribute vec4 a_data;      // x, y, size, alpha
    attribute float a_tint;
    uniform vec2 u_res;
    uniform float u_dpr;
    varying float v_alpha;
    varying float v_tint;
    void main() {
      vec2 clip = (a_data.xy / u_res) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      gl_PointSize = a_data.z * u_dpr;
      v_alpha = a_data.w;
      v_tint = a_tint;
    }`;
  const fsrc = `
    precision mediump float;
    varying float v_alpha;
    varying float v_tint;
    uniform float u_teal;
    void main() {
      vec2 d = gl_PointCoord - 0.5;
      float r = length(d);
      float glow = smoothstep(0.5, 0.0, r);
      glow *= glow;
      vec3 gold = vec3(0.906, 0.784, 0.470);
      vec3 teal = vec3(0.247, 0.749, 0.682);
      vec3 col = mix(gold, teal, v_tint * u_teal);
      gl_FragColor = vec4(col, glow * v_alpha * (1.0 + v_tint * u_teal * 0.6));
    }`;

  let uRes, uDpr, uTeal, lost = false;

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
    } catch (e) { canvas.remove(); return false; }
    gl.useProgram(prog);

    const aData = gl.getAttribLocation(prog, 'a_data');
    const aTint = gl.getAttribLocation(prog, 'a_tint');
    uRes = gl.getUniformLocation(prog, 'u_res');
    uDpr = gl.getUniformLocation(prog, 'u_dpr');
    uTeal = gl.getUniformLocation(prog, 'u_teal');
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aData);
    gl.vertexAttribPointer(aData, 4, gl.FLOAT, false, STRIDE * 4, 0);
    gl.enableVertexAttribArray(aTint);
    gl.vertexAttribPointer(aTint, 1, gl.FLOAT, false, STRIDE * 4, 16);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    return true;
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { if (initGL()) lost = false; });

  if (!initGL()) return;

  /* ---------- Interaction state ---------- */
  let mx = -9999, my = -9999;
  let parX = 0, parY = 0;
  window.addEventListener('pointermove', (e) => {
    // canvas fills #hero, which sits at document top: no rect read needed
    mx = e.clientX; my = e.clientY + window.scrollY;
    parX = (e.clientX / (window.innerWidth || 1) - 0.5);
    parY = (e.clientY / (window.innerHeight || 1) - 0.5);
  }, { passive: true });

  // main.js drives these; count/tealBurst read by vitals + easter egg
  window.__aletheia = { disperse: 0, assemble: 0, tealBurst: 0, count: COUNT };

  let running = true, visible = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; },
    { threshold: 0 }).observe(canvas);

  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT); resizeT = setTimeout(layout, 150);
  });
  window.addEventListener('load', layout);

  /* ---------- Simulation loop ---------- */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!running || !visible || lost) { last = now; return; }
    const dt = Math.min((now - last) / 16.666, 2.2); last = now;
    const t = now * 0.001;

    const st = window.__aletheia;
    const asm = st.assemble;
    const dis = st.disperse;
    const burst = st.tealBurst;
    const spring = 0.055 * asm * (1 - dis * 0.92);
    const damp = 0.86;
    const mR = 130, mR2 = mR * mR;
    const ox = parX * 26, oy = parY * 18;

    for (let i = 0; i < COUNT; i++) {
      const i2 = i * 2, i4 = i * 4, i5 = i * STRIDE;
      const isEmblem = i < targets.length;
      let tx = T[i2], ty = T[i2 + 1];
      if (isEmblem) {
        tx += ox; ty += oy;
        if (dis > 0) {
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

      const twinkle = 0.72 + 0.28 * Math.sin(t * spd * 2.1 + ph * 3.0);
      buf[i5]   = P[i2];
      buf[i5+1] = P[i2+1];
      buf[i5+2] = (2.6 + META[i2] * 3.1) * (isEmblem ? 1 : 0.8);
      buf[i5+3] = isEmblem
        ? (0.34 + 0.55 * twinkle) * asm * (1 - dis)
        : (0.06 + 0.11 * twinkle) * asm * (1 - dis * 0.55);
      buf[i5+4] = META[i2+1];
    }

    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uDpr, DPR);
    gl.uniform1f(uTeal, burst);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf);
    gl.drawArrays(gl.POINTS, 0, COUNT);
  }

  layout(); scatter();
  requestAnimationFrame(frame);
})();
