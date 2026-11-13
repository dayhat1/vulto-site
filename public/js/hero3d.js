/* Powered by Matioli616
   =========================================================================
   VULTO · hero 3D (peça autoral, gerada por código, sem modelo pronto)
   Uma figura encapuzada (LatheGeometry achatada) que emerge do escuro:
   - vertex shader: deslocamento por noise, mais forte na barra da capa
   - fragment shader: fresnel + iridescência (só na família do vermelho) e
     dissolução por noise com borda acesa (a figura se desfaz em fumaça embaixo)
   Reage a mouse, giroscópio (onde não precisa de permissão) e scroll.
   pixelRatio máx 1.5, render pausado fora da viewport e em aba oculta,
   e um medidor de FPS que devolve o hero ao fallback em CSS se ficar < 30.
   Carregado por home.js, só depois do primeiro paint.
   ========================================================================= */
import * as THREE from './vendor/three.module.min.js';

const NOISE = /* glsl */ `
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`;

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  ${NOISE}
  void main() {
    vec3 p = position;
    float h = smoothstep(0.2, -2.2, p.y);
    float n = noise(p * 1.6 + vec3(0.0, uTime * 0.22, uTime * 0.12));
    float amp = (0.025 + 0.36 * h * h) * (1.0 + uScroll * 1.6);
    p += normal * (n - 0.5) * 2.0 * amp;
    p.x += sin(p.y * 2.1 + uTime * 0.7) * 0.06 * h;
    vP = p;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform vec3 uRed;
  uniform vec3 uRedSoft;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  ${NOISE}
  void main() {
    float h = smoothstep(-0.5, -2.3, vP.y);
    float nn = noise(vP * 2.3 + vec3(0.0, -uTime * 0.28, 0.0));
    float cut = mix(-0.25, 0.9, h) + uScroll * 0.55;
    float a = nn - cut;
    if (a < 0.0) discard;
    float burn = 1.0 - smoothstep(0.0, 0.085, a);

    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float f = 1.0 - clamp(dot(n, normalize(vV)), 0.0, 1.0);
    float rim = pow(f, 2.3);

    // iridescência: película fina, mas presa à família do vermelho (um só destaque)
    vec3 irid = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.07, 0.15) + f * 0.9 + uTime * 0.02 + vP.y * 0.07));
    vec3 tint = mix(uRed, uRedSoft, irid.r);
    tint = mix(tint, vec3(1.0, 0.17, 0.42), irid.b * 0.32 * rim);

    vec3 col = vec3(0.018, 0.011, 0.014);
    col += tint * rim * 1.3;
    col += uRedSoft * pow(f, 6.5) * 0.85;
    col += uRedSoft * burn * 1.5;
    // os olhos: duas frestas de luz no capuz (eco da silhueta em SVG)
    float eyeY = smoothstep(0.045, 0.0, abs(vP.y - 1.36));
    float eyeX = smoothstep(0.05, 0.0, abs(abs(vP.x) - 0.2) - 0.09);
    col += uRedSoft * eyeY * eyeX * step(0.0, n.z) * 2.2;
    if (!gl_FrontFacing) col *= 0.35;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function buildFigure(detail) {
  // perfil da capa (raio, altura), de cima pra baixo
  const prof = [
    [0.0, 2.06], [0.22, 2.0], [0.4, 1.86], [0.5, 1.62], [0.5, 1.36], [0.4, 1.16],
    [0.5, 1.04], [0.82, 0.88], [1.02, 0.55], [1.16, -0.2], [1.34, -1.2], [1.52, -2.2],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const curve = new THREE.SplineCurve(prof);
  const pts = curve.getPoints(detail.rings);
  pts[0].x = 0;
  const geo = new THREE.LatheGeometry(pts, detail.segments);
  geo.scale(1, 1, 0.42); // achata: uma figura de frente, não um cone
  return geo;
}

export default function initHero3D(hero, opts = {}) {
  const mobile = matchMedia('(max-width: 900px)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-3d';
  canvas.setAttribute('aria-hidden', 'true');
  hero.querySelector('.hero-bg').append(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    canvas.remove();
    if (opts.onFail) opts.onFail('webgl');
    return { dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uRed: { value: new THREE.Color('#e3172e') },
    uRedSoft: { value: new THREE.Color('#ff4a5c') },
  };
  const figure = new THREE.Mesh(
    buildFigure(mobile ? { rings: 56, segments: 72 } : { rings: 90, segments: 140 }),
    new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, side: THREE.DoubleSide })
  );
  const group = new THREE.Group();
  group.add(figure);
  scene.add(group);

  // poeira de luz subindo devagar
  const COUNT = mobile ? 120 : 260;
  const pos = new Float32Array(COUNT * 3);
  const spd = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    spd[i] = 0.08 + Math.random() * 0.22;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    pgeo,
    new THREE.PointsMaterial({ color: 0xff4a5c, size: 0.03, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  scene.add(dust);

  /* layout: a figura ocupa a altura do hero, à direita do centro, atrás do celular */
  const layout = () => {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const visW = visH * camera.aspect;
    const s = (visH * (mobile ? 0.74 : 0.9)) / 4.3;
    group.scale.setScalar(s);
    group.position.set(mobile ? visW * 0.2 : visW * 0.2, mobile ? -visH * 0.02 : -visH * 0.03, 0);
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(hero);

  /* mouse + giroscópio (só onde não pede permissão) + scroll */
  let tx = 0, ty = 0, cx = 0, cy = 0, sc = 0, scT = 0;
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  const gyro = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function' && matchMedia('(pointer: coarse)').matches;
  const onTilt = (e) => {
    if (e.gamma == null || e.beta == null) return;
    tx = Math.max(-1, Math.min(1, e.gamma / 30));
    ty = Math.max(-1, Math.min(1, (e.beta - 50) / 30));
  };
  if (gyro) addEventListener('deviceorientation', onTilt, { passive: true });
  const onScroll = () => { scT = Math.min(Math.max(scrollY / Math.max(hero.clientHeight, 1), 0), 1); };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* loop com pausa e medidor de FPS */
  const clock = new THREE.Clock();
  let visible = true, running = false, raf = 0, disposed = false;
  let frames = 0, tStart = 0, checked = false;

  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    cx += (tx - cx) * 0.05;
    cy += (ty - cy) * 0.05;
    sc += (scT - sc) * 0.08;

    uniforms.uTime.value = t;
    uniforms.uScroll.value = sc;
    group.rotation.y = cx * 0.42;
    group.rotation.x = cy * 0.1;
    camera.position.x = cx * 0.35;
    camera.position.y = -cy * 0.2 - sc * 0.9;
    camera.position.z = 9 + sc * 1.6;
    camera.lookAt(0, -sc * 0.9, 0);

    const a = pgeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      a[i * 3 + 1] += spd[i] * dt;
      if (a[i * 3 + 1] > 4.8) a[i * 3 + 1] = -4.8;
    }
    pgeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);

    // FPS: ignora 0,6s de aquecimento e mede 2s; abaixo de 30 devolve o hero ao CSS
    if (!checked) {
      const now = performance.now();
      if (!tStart) tStart = now + 600;
      if (now >= tStart) {
        frames++;
        if (now - tStart >= 2000) {
          checked = true;
          const fps = (frames * 1000) / (now - tStart);
          if (fps < 30) fail('fps');
        }
      }
    }
  };
  const start = () => { if (!running && visible && !document.hidden && !disposed) { running = true; clock.getDelta(); tStart = 0; frames = 0; frame(); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); });
  io.observe(hero);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail('lost'); });

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    io.disconnect(); ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    removeEventListener('scroll', onScroll);
    if (gyro) removeEventListener('deviceorientation', onTilt);
    figure.geometry.dispose(); figure.material.dispose(); pgeo.dispose(); dust.material.dispose();
    renderer.dispose();
    canvas.remove();
  }
  function fail(why) { dispose(); if (opts.onFail) opts.onFail(why); }

  start();
  requestAnimationFrame(() => { canvas.classList.add('ready'); if (opts.onReady) opts.onReady(); });
  return { dispose };
}
