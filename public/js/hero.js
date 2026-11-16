/* Powered by Matioli616
   =========================================================================
   VULTO · hero 3D
   ~20.000 partículas (THREE.Points + ShaderMaterial próprio) formando um busto
   encapuzado e sem rosto. A silhueta é desenhada em código num canvas 2D e as
   posições saem de amostragem aleatória dos pixels preenchidos: nenhum .glb.
   Carregado por import() dinâmico (main.js) só em desktop, com WebGL e sem
   "menos movimento". Exporta mountHero(); devolve destroy().
   ========================================================================= */
import * as THREE from 'three';

const N = 20000;           // partículas
const BUST_H = 4.4;        // altura do busto em unidades do mundo
const ACCENT_SHARE = 0.05; // ~5% das partículas em vermelho

/* ---------- Silhueta: busto encapuzado desenhado em canvas 2D (viewBox 400x560) ---------- */
const BODY = 'M200 36C158 36 128 72 128 120C128 152 142 176 160 192C120 204 70 224 48 280C30 326 28 420 20 520L380 520C372 420 370 326 352 280C330 224 280 204 240 192C258 176 272 152 272 120C272 72 242 36 200 36Z';
const FACE_VOID = 'M200 78C174 78 156 100 156 128C156 152 172 172 200 176C228 172 244 152 244 128C244 100 226 78 200 78Z';

function sampleSilhouette(count) {
  const W = 400, H = 560;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff';
  g.fill(new Path2D(BODY));
  g.globalCompositeOperation = 'destination-out'; // o rosto é um vazio, não um rosto
  g.fill(new Path2D(FACE_VOID));
  const data = g.getImageData(0, 0, W, H).data;
  const filled = [];
  for (let i = 3; i < data.length; i += 4) if (data[i] > 128) filled.push((i - 3) >> 2);

  const s = BUST_H / H;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const idx = filled[(Math.random() * filled.length) | 0];
    const px = (idx % W) + Math.random() - 0.5;
    const py = ((idx / W) | 0) + Math.random() - 0.5;
    const x = (px - 200) * s;
    const y = (300 - py) * s;                       // centraliza o busto na vertical
    // profundidade leve: mais volume no meio do corpo, menos nas bordas
    const bulge = Math.max(0, 1 - Math.abs(px - 200) / 170);
    const z = (Math.random() - 0.5) * (0.25 + bulge * 0.55);
    pos.set([x, y, z], i * 3);
  }
  return pos;
}

/* ---------- Shaders ---------- */
const NOISE = /* glsl */`
// Simplex noise 3D (Ashima Arts / Ian McEwan, MIT)
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
// Campo vetorial de ruído (3 amostras deslocadas): dá a deriva e a "fumaça"
vec3 field(vec3 p){ return vec3(snoise(p), snoise(p+vec3(31.4,17.1,5.7)), snoise(p+vec3(11.3,47.2,23.1))); }
`;

const VERT = /* glsl */`
${NOISE}
uniform float uTime;      // segundos
uniform float uAssemble;  // 0 -> 1: partículas chegando na silhueta (~2s)
uniform float uScroll;    // 0 -> 1: silhueta se desfaz em fumaça (scrub do ScrollTrigger)
uniform float uPush;      // força da dispersão do mouse (mola, vem da CPU)
uniform vec3  uMouse;     // mouse no plano z=0, já suavizado (lerp) e em espaço local
uniform float uMouseR;    // raio de influência
uniform float uScale;     // px por unidade de mundo a 1 de distância
attribute vec3 aScatter;  // posição inicial espalhada
attribute vec4 aRand;     // x: atraso, y: tamanho, z/w: aleatórios livres
attribute float aAcc;     // 1 = partícula vermelha
varying float vAlpha;
varying float vAcc;

void main(){
  // 1) chegada: cada partícula tem um atraso próprio; ease-out cúbico
  float t = clamp((uAssemble - aRand.x * 0.45) / 0.55, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - t, 3.0);

  // 2) ocioso: respiração lenta (escala + subida) e deriva por ruído
  vec3 base = position;
  float br = sin(uTime * 0.7);
  base.xy *= 1.0 + 0.012 * br;
  base.y  += 0.035 * br;
  vec3 pos = base + field(base * 0.9 + vec3(0.0, 0.0, uTime * 0.12)) * 0.06;

  // 3) trajetória de chegada: sai do espalhado girando por ruído até a silhueta
  vec3 from = aScatter + field(aScatter * 0.25 + uTime * 0.15) * 1.2;
  pos = mix(from, pos, e);

  // 4) mouse: dispersa como fumaça dentro do raio; uPush é uma mola na CPU,
  //    então ao parar o mouse a força cai e as partículas voltam macio
  vec3 d = pos - uMouse; d.z *= 0.35;
  float dist = length(d);
  float f = smoothstep(uMouseR, 0.0, dist);
  vec3 smoke = normalize(d + 1e-4) * f * uPush * 1.1 + field(pos * 1.4 + uTime * 0.4) * f * uPush * 0.8;
  pos += smoke;

  // 5) scroll: sobe e se espalha como fumaça (cada partícula com uma velocidade)
  float s = smoothstep(0.0, 1.0, uScroll);
  pos.y += s * (1.5 + aRand.y * 4.5) * (0.5 + aRand.w);
  pos.xz += field(base * 0.7 + 3.0).xz * s * 1.6 + (aRand.zw - 0.5) * s * 2.2;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // tamanho com atenuação por distância (perspectiva)
  float size = (0.014 + aRand.y * 0.016) * (1.0 + f * 0.6);
  gl_PointSize = size * uScale / -mv.z;

  // alfa: fade na base do busto, névoa por distância, some com o scroll
  float bottom = smoothstep(-2.3, -0.9, position.y);
  float fog = clamp(1.0 - (-mv.z - 7.5) * 0.12, 0.25, 1.0);
  vAlpha = (0.35 + 0.65 * aRand.y) * bottom * fog * (1.0 - s) * smoothstep(0.0, 0.25, t);
  vAcc = aAcc;
}
`;

const FRAG = /* glsl */`
varying float vAlpha;
varying float vAcc;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = mix(vec3(0.93), vec3(1.0, 0.16, 0.24), vAcc); // branco / vermelho (#e3172e, mais vivo por causa do blend aditivo)
  gl_FragColor = vec4(col, a * a * vAlpha);
}
`;

/* ---------- Montagem ---------- */
export function mountHero(hero, { canvas, state, onReady, onFail, watchdog = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x050505, 0);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.02); // névoa preta (o shader próprio aplica a sua; isto cobre extensões futuras)
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0, 7);

  // --- geometria ---
  const target = sampleSilhouette(N);
  const scatter = new Float32Array(N * 3);
  const rand = new Float32Array(N * 4);
  const acc = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 5 + Math.random() * 9;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    scatter.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.7, r * Math.cos(ph)], i * 3);
    rand.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    acc[i] = Math.random() < ACCENT_SHARE ? 1 : 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(target, 3));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  geo.setAttribute('aAcc', new THREE.BufferAttribute(acc, 1));

  const uniforms = {
    uTime: { value: 0 }, uAssemble: { value: 0 }, uScroll: { value: 0 }, uPush: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) }, uMouseR: { value: 1.25 }, uScale: { value: 1000 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; // o vertex shader move os pontos para fora do bounding box
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // --- tamanho (debounce no resize), pixel ratio máx. 2 ---
  let w = 0, h = 0;
  const fit = () => {
    w = hero.clientWidth; h = hero.clientHeight;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    // tela larga: o busto vai para a direita (o texto fica à esquerda); estreita: centralizado
    const visW = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;
    group.position.x = camera.aspect > 1.15 ? visW * 0.2 : 0;
    group.position.y = camera.aspect > 1.15 ? -0.2 : 0.5;
  };
  fit();
  let rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(fit, 150); };
  window.addEventListener('resize', onResize);

  // --- mouse: ponto no plano z=0, suavizado (lerp); força é uma mola ---
  const ndc = new THREE.Vector2(9, 9);
  const mTarget = new THREE.Vector3(99, 99, 0);
  const mouse = new THREE.Vector3(99, 99, 0);
  let lastMove = -1e9, inside = false;
  const ray = new THREE.Vector3();
  const onMove = (ev) => {
    const r = hero.getBoundingClientRect();
    inside = ev.clientY >= r.top && ev.clientY <= r.bottom;
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
    ray.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
    const dist = -camera.position.z / ray.z;
    mTarget.copy(camera.position).addScaledVector(ray, dist).sub(group.position);
    lastMove = performance.now();
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  // --- pausa: fora da tela e aba sem foco ---
  let visible = true, tabOn = !document.hidden, raf = 0, running = false, dead = false;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; sync(); }, { threshold: 0 });
  io.observe(hero);
  const onVis = () => { tabOn = !document.hidden; sync(); };
  document.addEventListener('visibilitychange', onVis);

  // --- loop ---
  let t0 = performance.now(), prev = t0, simT = 0, assemble = 0, ready = false;
  let push = 0, pushV = 0, scrollS = 0, slow = 0, seen = 0;
  const prevMouse = new THREE.Vector3();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    simT += dt;
    uniforms.uTime.value = simT;

    // chegada em ~2s
    assemble = Math.min(1, assemble + dt / 2.2);
    uniforms.uAssemble.value = assemble;

    // mouse com lerp (independente de fps)
    const k = 1 - Math.exp(-dt * 9);
    prevMouse.copy(mouse);
    mouse.lerp(mTarget, k);
    const speed = prevMouse.distanceTo(mouse) / Math.max(dt, 1e-3);
    uniforms.uMouse.value.copy(mouse);
    // alvo da mola: ativo enquanto o mouse se mexe dentro do hero; zero ao parar
    const active = inside && now - lastMove < 140;
    const goal = active ? Math.min(1.1, 0.35 + speed * 0.5) : 0;
    pushV += ((goal - push) * 70 - pushV * 9) * dt; // mola levemente subamortecida
    push = Math.max(0, push + pushV * dt);
    uniforms.uPush.value = push;

    // scroll (0..1, vem do GSAP ScrollTrigger com scrub) + câmera recuando
    scrollS += ((state ? state.p : 0) - scrollS) * (1 - Math.exp(-dt * 10));
    uniforms.uScroll.value = scrollS;
    camera.position.z = 7 + scrollS * 3.2;

    renderer.render(scene, camera);

    if (!ready) { ready = true; onReady && onReady(); }

    // vigia de fps: se ficar lento depois da chegada, desiste do 3D e volta ao fallback
    if (watchdog && assemble >= 1) {
      seen += dt; slow += dt > 1 / 28 ? dt : 0;
      if (seen > 2.5) { if (slow / seen > 0.6) { destroy(); onFail && onFail(); return; } seen = 0; slow = 0; }
    }
  }
  function sync() {
    const should = visible && tabOn && !dead;
    if (should && !running) { running = true; prev = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
  }
  sync();

  function destroy() {
    if (dead) return;
    dead = true; running = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onMove);
    clearTimeout(rt);
    geo.dispose(); mat.dispose(); renderer.dispose();
    renderer.forceContextLoss();
  }
  return destroy;
}
