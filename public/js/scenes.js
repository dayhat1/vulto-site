/* Powered by Matioli616
   =========================================================================
   VULTO · cenas 3D do site
   Um único WebGLRenderer e um único <canvas> fixo desenham TODAS as cenas:
   cada cena tem um "slot" no HTML ([data-scene]) e é renderizada só dentro do
   retângulo dele (viewport + scissor). Assim o site tem várias animações 3D
   sem estourar o limite de contextos WebGL do navegador.

   Cenas (cada uma casa com o texto da seção onde está):
     globe-hero   Hero      planeta de partículas, mini PCs nos países, arcos de
                            energia entre eles e satélites orbitando
     constellation Serviços  núcleo + 7 satélites, um por serviço, ligados ao núcleo
     pipeline     Como func. 3 mini PCs (Diagnóstico → Construção → Operação);
                            a energia avança com o scroll
     globe-cases  Cases     planeta menor com 5 estações, uma por case
     beacon       CTA final todos os arcos convergem para um ponto (o WhatsApp)

   Carregado por import() dinâmico (main.js) só em desktop, com WebGL e sem
   "menos movimento". Exporta mountScenes(); devolve destroy().
   ========================================================================= */
import * as THREE from 'three';

const TAU = Math.PI * 2;
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const RED = 0xe3172e;

/* ---------- Geografia: cidades onde "moram" os mini PCs ---------- */
const CITIES = {
  sp: [-23.5, -46.6], ny: [40.7, -74], la: [34, -118.2], mx: [19.4, -99.1], ba: [-34.6, -58.4],
  lon: [51.5, -0.1], ber: [52.5, 13.4], lag: [6.5, 3.4], jnb: [-26.2, 28], dxb: [25.2, 55.3],
  bom: [19, 72.8], sin: [1.35, 103.8], tyo: [35.7, 139.7], syd: [-33.9, 151.2], mow: [55.7, 37.6], nbo: [-1.3, 36.8],
};
const ALL_CITIES = Object.keys(CITIES);
const LINKS = [['sp', 'ny'], ['sp', 'lon'], ['lon', 'dxb'], ['dxb', 'sin'], ['sin', 'tyo'], ['tyo', 'la'], ['la', 'ny'], ['ny', 'lon'],
  ['lag', 'sp'], ['lag', 'lon'], ['jnb', 'dxb'], ['syd', 'sin'], ['bom', 'dxb'], ['ber', 'mow'], ['ba', 'sp'], ['mx', 'la'],
  ['nbo', 'bom'], ['mow', 'tyo'], ['jnb', 'lag'], ['syd', 'tyo']];

function ll2v(lat, lon, r = 1) {
  const phi = ((90 - lat) * Math.PI) / 180, th = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
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
vec3 field(vec3 p){ return vec3(snoise(p), snoise(p+vec3(31.4,17.1,5.7)), snoise(p+vec3(11.3,47.2,23.1))); }
`;

// Planeta de pontos. Os continentes saem de ruído + "manchas" em volta das cidades,
// então todo mini PC fica sobre terra. Pontos de terra são maiores e mais claros.
const PLANET_VERT = /* glsl */`
${NOISE}
uniform float uTime, uAssemble, uScroll, uScale, uFade;
uniform vec3 uCity[16];
attribute vec3 aScatter;
attribute vec4 aRand;   // x: atraso de chegada, y: tamanho, z/w: livres
attribute float aAcc;   // 1 = ponto vermelho
varying float vAlpha;
varying float vAcc;
void main(){
  // chegada: cada ponto vem do espalhado até a esfera, com atraso próprio (ease-out cúbico)
  float t = clamp((uAssemble - aRand.x * 0.45) / 0.55, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - t, 3.0);

  vec3 p = position;
  float cont = snoise(p * 1.6 + vec3(7.3)) * 0.65 + snoise(p * 3.7 + vec3(1.7)) * 0.35;
  float land = smoothstep(0.02, 0.14, cont);
  for (int i = 0; i < 16; i++) land = max(land, smoothstep(0.36, 0.14, distance(p, uCity[i])));

  // respiração leve da terra
  vec3 pos = p * (1.0 + land * 0.014 + 0.006 * sin(uTime * 0.8 + aRand.z * 6.2832) * land);
  vec3 from = aScatter + field(aScatter * 0.25 + uTime * 0.15) * 1.0;
  pos = mix(from, pos, e);

  // scroll: o planeta se desfaz em fumaça para cima
  float s = smoothstep(0.0, 1.0, uScroll);
  pos.y += s * (1.0 + aRand.y * 3.5) * (0.5 + aRand.w);
  pos.xz += (aRand.zw - 0.5) * s * 2.4 + field(p * 0.7 + 3.0).xz * s;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  // teto de tamanho: partículas espalhadas que passam perto da câmera não viram "bolas" gigantes
  gl_PointSize = min((0.0095 + aRand.y * 0.0105) * (0.5 + land * 1.25) * uScale / max(-mv.z, 0.5), 0.0075 * uScale);

  vec3 n = normalize((modelViewMatrix * vec4(p, 0.0)).xyz);
  float rim = pow(1.0 - abs(n.z), 2.0);
  vAlpha = (0.10 + 1.1 * land + 0.4 * rim) * (0.5 + 0.5 * aRand.y) * (1.0 - s) * smoothstep(0.0, 0.25, t) * uFade;
  vAcc = aAcc * land;
}
`;

const POINT_FRAG = /* glsl */`
varying float vAlpha;
varying float vAcc;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  vec3 col = mix(vec3(0.93), vec3(1.0, 0.16, 0.24), vAcc);
  gl_FragColor = vec4(col, a * a * vAlpha);
}
`;

// Arcos de energia: curva de Bézier quadrática avaliada no vertex shader.
// Um pulso (cabeça + rastro) viaja de A para B; cada arco tem fase e velocidade próprias.
const BEZ = /* glsl */`
attribute vec3 aA; attribute vec3 aB; attribute vec3 aC;
vec3 bez(float t){ float u = 1.0 - t; return u*u*aA + 2.0*u*t*aC + t*t*aB; }
`;
const ARC_VERT = /* glsl */`
${BEZ}
attribute float aT;
attribute vec2 aPh;       // x: fase, y: velocidade
uniform float uTime, uFade, uIntro;
varying float vA; varying float vG;
void main(){
  gl_Position = projectionMatrix * modelViewMatrix * vec4(bez(aT), 1.0);
  float head = fract(uTime * aPh.y + aPh.x);
  float d = mod(head - aT + 1.0, 1.0);          // distância atrás da cabeça do pulso
  float g = exp(-d * 9.0) * step(d, 0.6);
  vG = g;
  vA = (0.40 + 1.6 * g) * uFade * uIntro * (0.35 + 0.65 * sin(aT * 3.14159));
}
`;
const ARC_FRAG = /* glsl */`
varying float vA; varying float vG;
void main(){
  vec3 col = mix(vec3(0.72), vec3(1.0, 0.22, 0.30), clamp(vG * 1.4, 0.0, 1.0));
  gl_FragColor = vec4(col, vA);
}
`;
const PACKET_VERT = /* glsl */`
${BEZ}
attribute vec2 aPh;
uniform float uTime, uFade, uIntro, uScale;
varying float vA;
void main(){
  float t = fract(uTime * aPh.y + aPh.x);
  vec4 mv = modelViewMatrix * vec4(bez(t), 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(0.045 * uScale / max(-mv.z, 0.5), 0.012 * uScale);
  vA = sin(t * 3.14159) * uFade * uIntro;
}
`;
const PACKET_FRAG = /* glsl */`
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(mix(vec3(1.0, 0.85, 0.88), vec3(1.0, 0.2, 0.28), d * 1.6), a * vA);
}
`;
const ATMO_VERT = /* glsl */`
varying vec3 vN;
void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ATMO_FRAG = /* glsl */`
uniform float uFade;
varying vec3 vN;
void main(){
  float i = pow(clamp(1.0 - abs(vN.z), 0.0, 1.0), 3.2);
  gl_FragColor = vec4(1.0, 0.12, 0.2, i * 0.75 * uFade);
}
`;

/* ---------- Blocos reutilizáveis ---------- */
const add = THREE.AdditiveBlending;

function makeUniforms() {
  const far = new THREE.Vector3(9, 9, 9);
  return {
    uTime: { value: 0 }, uAssemble: { value: 1 }, uScroll: { value: 0 }, uScale: { value: 1000 },
    uFade: { value: 1 }, uIntro: { value: 1 },
    uCity: { value: Array.from({ length: 16 }, () => far.clone()) },
  };
}

function planetPoints(U, count, scatterR = 3) {
  const pos = new Float32Array(count * 3), sc = new Float32Array(count * 3), rd = new Float32Array(count * 4), ac = new Float32Array(count);
  const g = Math.PI * (3 - Math.sqrt(5)), jit = 0.35 / Math.sqrt(count);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2, r = Math.sqrt(1 - y * y), th = g * i;
    const v = new THREE.Vector3(Math.cos(th) * r + rnd(-jit, jit), y + rnd(-jit, jit), Math.sin(th) * r + rnd(-jit, jit)).normalize();
    pos.set([v.x, v.y, v.z], i * 3);
    const d = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(scatterR * (0.6 + Math.random()));
    sc.set([d.x, d.y, d.z], i * 3);
    rd.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    ac[i] = Math.random() < 0.05 ? 1 : 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(sc, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rd, 4));
  geo.setAttribute('aAcc', new THREE.BufferAttribute(ac, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: PLANET_VERT, fragmentShader: POINT_FRAG,
    transparent: true, depthWrite: false, blending: add,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}

// Esfera invisível que só escreve profundidade: esconde o lado de trás do planeta
function occluder(r = 0.985) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.MeshBasicMaterial({ colorWrite: false }));
  m.renderOrder = -1;
  return m;
}

function atmosphere(U, r = 1.1) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 48, 32),
    new THREE.ShaderMaterial({ uniforms: { uFade: U.uFade }, vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, transparent: true, depthWrite: false, blending: add }),
  );
}

function graticule(r = 1.004) {
  const verts = [];
  const ring = (fn) => { for (let i = 0; i < 96; i++) { verts.push(...fn(i / 96 * TAU), ...fn((i + 1) / 96 * TAU)); } };
  for (const lat of [-60, -30, 0, 30, 60]) { const y = Math.sin(lat * Math.PI / 180) * r, rr = Math.cos(lat * Math.PI / 180) * r; ring((a) => [Math.cos(a) * rr, y, Math.sin(a) * rr]); }
  for (let k = 0; k < 6; k++) { const m = (k / 6) * Math.PI; ring((a) => [Math.cos(a) * Math.cos(m) * r, Math.sin(a) * r, Math.cos(a) * Math.sin(m) * r]); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9a9aa4, transparent: true, opacity: 0.07, depthWrite: false }));
}

// Mini PC: caixinha escura com contorno branco, LED vermelho e anel que pulsa
const PC_GEO = new THREE.BoxGeometry(0.1, 0.055, 0.1);
const PC_EDGES = new THREE.EdgesGeometry(PC_GEO);
function miniPC(scale = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(PC_GEO, new THREE.MeshBasicMaterial({ color: 0x17171b }));
  const edges = new THREE.LineSegments(PC_EDGES, new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.75 }));
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: RED }));
  led.position.set(0.03, 0.036, 0.03);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.083, 40), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: add }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = -0.02;
  g.add(body, edges, led, ring);
  g.scale.setScalar(scale);
  return { g, body, edges, led, ring };
}

function satellite() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.045), new THREE.MeshBasicMaterial({ color: 0xcfcfd6 }));
  const panelGeo = new THREE.BoxGeometry(0.1, 0.004, 0.05);
  const panelEdges = new THREE.EdgesGeometry(panelGeo);
  const panelMat = new THREE.MeshBasicMaterial({ color: 0x3a0b12 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.55 });
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(panelGeo, panelMat); p.position.x = sx * 0.085;
    const e = new THREE.LineSegments(panelEdges, edgeMat); e.position.x = sx * 0.085;
    g.add(p, e);
  }
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3a4a }));
  led.position.y = 0.04;
  g.add(body, led);
  return { g, led };
}

function orbitRing(r, opacity = 0.1) {
  const v = [];
  for (let i = 0; i < 128; i++) { const a = (i / 128) * TAU, b = ((i + 1) / 128) * TAU; v.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(b) * r, 0, Math.sin(b) * r); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false }));
}

// Arcos entre cidades: Bézier elevada acima da superfície, avaliada na GPU
function energyArcs(U, pairs, nodePos, { lift = 0.2, seg = 48, converge = null } = {}) {
  const verts = pairs.length * seg * 2;
  const A = new Float32Array(verts * 3), B = new Float32Array(verts * 3), C = new Float32Array(verts * 3);
  const T = new Float32Array(verts), PH = new Float32Array(verts * 2);
  const pA = new Float32Array(pairs.length * 3), pB = new Float32Array(pairs.length * 3), pC = new Float32Array(pairs.length * 3), pPH = new Float32Array(pairs.length * 2);
  let k = 0;
  pairs.forEach(([ka, kb], i) => {
    const a = nodePos[ka].clone().multiplyScalar(1.01), b = nodePos[converge || kb].clone().multiplyScalar(1.01);
    const ang = a.angleTo(b), peak = 1.0 + lift + 0.4 * (ang / Math.PI);
    const c = a.clone().add(b).multiplyScalar(-0.25).add(a.clone().add(b).normalize().multiplyScalar(peak)).multiplyScalar(2);
    const ph = rnd(), sp = rnd(0.16, 0.3);
    for (let s = 0; s < seg; s++) for (let e = 0; e < 2; e++) {
      A.set([a.x, a.y, a.z], k * 3); B.set([b.x, b.y, b.z], k * 3); C.set([c.x, c.y, c.z], k * 3);
      T[k] = (s + e) / seg; PH.set([ph, sp], k * 2); k++;
    }
    pA.set([a.x, a.y, a.z], i * 3); pB.set([b.x, b.y, b.z], i * 3); pC.set([c.x, c.y, c.z], i * 3); pPH.set([ph, sp], i * 2);
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  lg.setAttribute('aA', new THREE.BufferAttribute(A, 3)); lg.setAttribute('aB', new THREE.BufferAttribute(B, 3)); lg.setAttribute('aC', new THREE.BufferAttribute(C, 3));
  lg.setAttribute('aT', new THREE.BufferAttribute(T, 1)); lg.setAttribute('aPh', new THREE.BufferAttribute(PH, 2));
  const lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: ARC_VERT, fragmentShader: ARC_FRAG, transparent: true, depthWrite: false, blending: add }));
  lines.frustumCulled = false;
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pairs.length * 3), 3));
  pg.setAttribute('aA', new THREE.BufferAttribute(pA, 3)); pg.setAttribute('aB', new THREE.BufferAttribute(pB, 3)); pg.setAttribute('aC', new THREE.BufferAttribute(pC, 3));
  pg.setAttribute('aPh', new THREE.BufferAttribute(pPH, 2));
  const packets = new THREE.Points(pg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: PACKET_VERT, fragmentShader: PACKET_FRAG, transparent: true, depthWrite: false, blending: add }));
  packets.frustumCulled = false;
  return [lines, packets];
}

// textura redonda para PointsMaterial (sem isso os pontos saem quadrados)
let _dot;
function dotTex() {
  if (_dot) return _dot;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (_dot = new THREE.CanvasTexture(c));
}

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry && o.geometry !== PC_GEO && o.geometry !== PC_EDGES) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map && m.map === _dot) return; m.dispose(); });
  });
}

/* ---------- Cena: planeta (hero, cases, beacon) ---------- */
function buildGlobe(cfg) {
  const U = makeUniforms();
  const root = new THREE.Group(), globe = new THREE.Group(), orbits = new THREE.Group();
  root.add(globe, orbits);
  globe.rotation.z = 0.35; // inclinação do eixo

  const cities = cfg.cities || ALL_CITIES;
  cities.forEach((k, i) => U.uCity.value[i].copy(ll2v(...CITIES[k])));
  globe.add(planetPoints(U, cfg.points, 3), atmosphere(U), graticule(), occluder());

  const nodePos = {}, nodes = [];
  cities.forEach((k) => {
    nodePos[k] = ll2v(...CITIES[k]);
    const m = miniPC(cfg.pcScale || 1);
    m.g.position.copy(nodePos[k]).multiplyScalar(1.012);
    m.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nodePos[k].clone().normalize());
    m.phase = rnd();
    m.big = k === cfg.beacon;
    if (m.big) m.g.scale.setScalar((cfg.pcScale || 1) * 1.7);
    globe.add(m.g);
    nodes.push(m);
  });
  const pairs = (cfg.links || LINKS).filter(([a, b]) => nodePos[a] && nodePos[b]);
  globe.add(...energyArcs(U, pairs, nodePos, { converge: cfg.beacon || null }));

  // satélites em órbitas inclinadas (não giram junto com o planeta)
  const sats = [];
  for (let i = 0; i < (cfg.sats || 0); i++) {
    const r = 1.32 + i * 0.075, pivot = new THREE.Group(), s = satellite();
    pivot.rotation.set(rnd(-0.9, 0.9), rnd(0, TAU), rnd(-0.9, 0.9));
    s.g.position.x = r;
    const orbit = orbitRing(r, 0.09);
    pivot.add(orbit, s.g); orbits.add(pivot);
    sats.push({ pivot, s, orbit, speed: rnd(0.12, 0.26) * (Math.random() < 0.5 ? -1 : 1), a: rnd(0, TAU), ph: rnd() });
  }
  // feixes dos satélites para a cidade mais próxima
  const beamN = Math.min(4, sats.length);
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(beamN * 6), 3));
  const beams = new THREE.LineSegments(beamGeo, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.55, depthWrite: false, blending: add }));
  beams.frustumCulled = false;
  root.add(beams);

  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const mouseRot = { x: 0, y: 0 };
  return {
    root, U, fov: 36, fx: cfg.fx || 1.75, fy: cfg.fy || 1.75,
    update(t, dt, ctx) {
      const s = ctx.scroll;
      U.uTime.value = t;
      U.uScroll.value = s;
      U.uFade.value = (1 - s * 0.9) * (cfg.alpha ?? 1);
      if (cfg.intro) { U.uAssemble.value = clamp01(ctx.age / 2.2); U.uIntro.value = smooth(1.1, 2.6, ctx.age); }
      globe.rotation.y = t * 0.05;
      if (cfg.mouse) {
        mouseRot.x += (ctx.mouse.y * 0.14 - mouseRot.x) * (1 - Math.exp(-dt * 3));
        mouseRot.y += (ctx.mouse.x * 0.28 - mouseRot.y) * (1 - Math.exp(-dt * 3));
        root.rotation.set(mouseRot.x, mouseRot.y, 0);
      }
      const fadeObj = 1 - smooth(0.05, 0.6, s); // mini PCs e satélites encolhem no scroll do hero
      nodes.forEach((n) => {
        const base = (cfg.pcScale || 1) * (n.big ? 1.7 : 1);
        n.g.scale.setScalar(Math.max(0.0001, base * fadeObj * smooth(0.8, 1.6, ctx.age + (cfg.intro ? 0 : 9))));
        const k = (t * (n.big ? 0.5 : 0.35) + n.phase) % 1;
        n.ring.scale.setScalar(1 + k * (n.big ? 3.2 : 1.8));
        n.ring.material.opacity = (1 - k) * (n.big ? 0.9 : 0.6);
        n.led.material.color.setHex(Math.sin(t * 3 + n.phase * 6) > 0 ? 0xff3a4a : 0x7a1220);
      });
      const beamPos = beams.geometry.attributes.position;
      sats.forEach((o, i) => {
        o.a += o.speed * dt; o.s.g.position.set(Math.cos(o.a) * (1.32 + i * 0.075), 0, Math.sin(o.a) * (1.32 + i * 0.075));
        o.s.g.scale.setScalar(Math.max(0.0001, fadeObj));
        o.orbit.material.opacity = 0.09 * fadeObj;
        o.s.led.material.color.setHex(Math.sin(t * 2.4 + o.ph * 6) > 0.2 ? 0xff3a4a : 0x5a0e18);
        if (i < beamN) {
          o.s.g.getWorldPosition(v1); root.worldToLocal(v1);
          let best = 1e9, bp = null;
          nodes.forEach((n) => { n.g.getWorldPosition(v2); root.worldToLocal(v2); const d = v1.distanceTo(v2); if (d < best) { best = d; bp = v2.clone(); } });
          if (bp && best < 0.95 && fadeObj > 0.5) beamPos.setXYZ(i * 2, v1.x, v1.y, v1.z), beamPos.setXYZ(i * 2 + 1, bp.x, bp.y, bp.z);
          else beamPos.setXYZ(i * 2, 0, 0, 0), beamPos.setXYZ(i * 2 + 1, 0, 0, 0);
        }
      });
      beamPos.needsUpdate = true;
    },
    dispose: () => disposeTree(root),
  };
}

/* ---------- Cena: constelação de serviços (7 satélites ligados ao núcleo) ---------- */
function buildConstellation() {
  const U = makeUniforms();
  const root = new THREE.Group();
  const core = planetPoints(U, 3800, 2.2);
  core.scale.setScalar(0.55);
  const coreG = new THREE.Group(); coreG.add(core, occluder(0.55 * 0.985), atmosphere(U, 0.62));
  root.add(coreG);

  const N = 7, sats = [];
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.4, depthWrite: false, blending: add }));
  links.frustumCulled = false;
  const pkGeo = new THREE.BufferGeometry();
  pkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  const packets = new THREE.Points(pkGeo, new THREE.PointsMaterial({ color: 0xffd5da, size: 0.09, map: dotTex(), transparent: true, opacity: 0.95, depthWrite: false, blending: add }));
  packets.frustumCulled = false;
  root.add(links, packets);

  for (let i = 0; i < N; i++) {
    const r = 0.95 + (i % 4) * 0.2, pivot = new THREE.Group(), s = satellite();
    pivot.rotation.set((i / N) * 2.4 - 1.2, (i * 2.399) % TAU, ((i * 0.9) % 1.6) - 0.8);
    pivot.add(orbitRing(r, 0.1), s.g); root.add(pivot);
    sats.push({ pivot, s, r, a: (i / N) * TAU, speed: (0.18 + (i % 3) * 0.06) * (i % 2 ? -1 : 1), ph: i / N });
  }
  const v = new THREE.Vector3();
  const lp = links.geometry.attributes.position, pp = packets.geometry.attributes.position;
  return {
    root, U, fov: 36, fx: 1.6, fy: 1.6,
    update(t, dt, ctx) {
      U.uTime.value = t;
      U.uAssemble.value = clamp01(ctx.age / 2.0);
      root.rotation.y = t * 0.05;
      coreG.rotation.y = t * 0.12;
      sats.forEach((o, i) => {
        o.a += o.speed * dt;
        o.s.g.position.set(Math.cos(o.a) * o.r, 0, Math.sin(o.a) * o.r);
        o.s.led.material.color.setHex(Math.sin(t * 2.4 + i) > 0.2 ? 0xff3a4a : 0x5a0e18);
        o.s.g.getWorldPosition(v); root.worldToLocal(v);
        lp.setXYZ(i * 2, 0, 0, 0); lp.setXYZ(i * 2 + 1, v.x, v.y, v.z);
        const k = (t * 0.35 + o.ph) % 1;
        pp.setXYZ(i, v.x * k, v.y * k, v.z * k);
      });
      lp.needsUpdate = true; pp.needsUpdate = true;
    },
    dispose: () => disposeTree(root),
  };
}

/* ---------- Cena: pipeline (Diagnóstico → Construção → Operação) ---------- */
function buildPipeline() {
  const root = new THREE.Group();
  root.rotation.x = 0.32;
  const xs = [-1.7, 0, 1.7], ys = [-0.15, 0.3, -0.15];
  const nodes = xs.map((x, i) => { const m = miniPC(2.3); m.g.position.set(x, ys[i], 0); root.add(m.g); return m; });

  // piso de pontos em perspectiva
  const fp = [];
  for (let x = -14; x <= 14; x++) for (let z = -5; z <= 5; z++) fp.push(x * 0.3, -0.62, z * 0.3);
  const floor = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0x8a8a93, size: 0.04, map: dotTex(), transparent: true, opacity: 0.5, depthWrite: false }));
  floor.geometry.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  root.add(floor);

  const curves = [0, 1].map((i) => {
    const a = nodes[i].g.position, b = nodes[i + 1].g.position;
    return new THREE.QuadraticBezierCurve3(a.clone().add(new THREE.Vector3(0.12, 0.05, 0)), a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.75, 0)), b.clone().add(new THREE.Vector3(-0.12, 0.05, 0)));
  });
  const SEG = 60;
  const arcs = curves.map((c) => {
    const pts = c.getPoints(SEG);
    const dim = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 }));
    const lit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 1, blending: add }));
    lit.geometry.setDrawRange(0, 0);
    root.add(dim, lit);
    return { lit, pk: [0, 1, 2].map(() => null) };
  });
  const pkGeo = new THREE.BufferGeometry();
  pkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * 3), 3));
  const packets = new THREE.Points(pkGeo, new THREE.PointsMaterial({ color: 0xffd5da, size: 0.14, map: dotTex(), transparent: true, opacity: 1, depthWrite: false, blending: add }));
  packets.frustumCulled = false;
  root.add(packets);
  const pp = packets.geometry.attributes.position;
  const tmp = new THREE.Vector3();

  return {
    root, fov: 34, fx: 2.4, fy: 0.95,
    update(t, dt, ctx) {
      // proc < 0: sem ScrollTrigger (CDN fora do ar etc.): a animação roda sozinha em ciclo
      const proc = ctx.state.proc >= 0 ? ctx.state.proc : (t * 0.1) % 1;
      const prog = [clamp01((proc - 0.05) / 0.4), clamp01((proc - 0.5) / 0.4)];
      const lit = [true, prog[0] >= 1, prog[1] >= 1];
      nodes.forEach((n, i) => {
        n.edges.material.color.setHex(lit[i] ? 0xff4a5c : 0x8a8a93);
        n.led.material.color.setHex(lit[i] ? (Math.sin(t * 4 + i) > 0 ? 0xff3a4a : 0x9a1626) : 0x2a2a30);
        const k = (t * 0.45 + i * 0.3) % 1;
        n.ring.visible = lit[i];
        n.ring.scale.setScalar(1 + k * 1.6); n.ring.material.opacity = (1 - k) * 0.7;
        n.g.position.y = ys[i] + Math.sin(t * 0.8 + i) * 0.02;
      });
      arcs.forEach((a, i) => {
        a.lit.geometry.setDrawRange(0, Math.floor((SEG + 1) * prog[i]));
        for (let j = 0; j < 3; j++) {
          const k = (t * 0.55 + j / 3) % 1 * prog[i];
          if (prog[i] > 0.02) { curves[i].getPoint(k, tmp); pp.setXYZ(i * 3 + j, tmp.x, tmp.y, tmp.z); }
          else pp.setXYZ(i * 3 + j, 0, -99, 0);
        }
      });
      pp.needsUpdate = true;
      root.rotation.y = Math.sin(t * 0.25) * 0.12;
    },
    dispose: () => disposeTree(root),
  };
}

/* =========================================================================
   Cenas temáticas do blog: cada post usa a que combina com o assunto.
   Todas movidas por JS simples (poucos pontos/linhas), sem shader próprio.
   ========================================================================= */
const dots = (n, color, size, opacity = 1, vertexColors = false) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  if (vertexColors) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: dotTex(), transparent: true, opacity, depthWrite: false, blending: add, vertexColors }));
  p.frustumCulled = false;
  return p;
};
const segs = (arr, color, opacity) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
};
const circle = (r, n = 96) => { const v = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU, b = ((i + 1) / n) * TAU; v.push(Math.cos(a) * r, Math.sin(a) * r, 0, Math.cos(b) * r, Math.sin(b) * r, 0); } return v; };
const setP = (pts, i, x, y, z) => pts.geometry.attributes.position.setXYZ(i, x, y, z);
const flush = (...pts) => pts.forEach((p) => { p.geometry.attributes.position.needsUpdate = true; if (p.geometry.attributes.color) p.geometry.attributes.color.needsUpdate = true; });
const done = (root) => ({ dispose: () => disposeTree(root) });

/* IA: rede neural. Pulsos atravessam as 4 camadas até a saída em vermelho. */
function buildNeural() {
  const root = new THREE.Group();
  const L = [4, 6, 6, 3], xs = [-2.1, -0.7, 0.7, 2.1], layers = [];
  L.forEach((n, li) => layers.push(Array.from({ length: n }, (_, i) => new THREE.Vector3(xs[li], (i - (n - 1) / 2) * 0.4 + rnd(-0.05, 0.05), rnd(-0.3, 0.3)))));
  const ev = [];
  for (let li = 0; li < 3; li++) for (const a of layers[li]) for (const b of layers[li + 1]) ev.push(a.x, a.y, a.z, b.x, b.y, b.z);
  root.add(segs(ev, 0xffffff, 0.11));
  const nodes = dots(L[0] + L[1] + L[2], 0xf2f2f2, 0.14), out = dots(L[3], 0xff3a4a, 0.24), pk = dots(44, 0xffd5da, 0.15);
  [...layers[0], ...layers[1], ...layers[2]].forEach((v, i) => setP(nodes, i, v.x, v.y, v.z));
  layers[3].forEach((v, i) => setP(out, i, v.x, v.y, v.z));
  flush(nodes, out); root.add(nodes, out, pk);
  const chains = Array.from({ length: 44 }, () => ({ c: layers.map((l) => l[(Math.random() * l.length) | 0]), ph: rnd(), sp: rnd(0.12, 0.24) }));
  return {
    root, fov: 34, fx: 2.5, fy: 1.2, ...done(root),
    update(t) {
      chains.forEach((p, i) => {
        const k = ((t * p.sp + p.ph) % 1) * 3, s = Math.min(2, Math.floor(k)), f = k - s, a = p.c[s], b = p.c[s + 1];
        setP(pk, i, a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f);
      });
      flush(pk);
      root.rotation.y = Math.sin(t * 0.3) * 0.18;
      out.material.opacity = 0.7 + 0.3 * Math.sin(t * 2.2);
    },
  };
}

/* Atendimento / WhatsApp: mensagens chegam de vários clientes, a IA responde a cada um. */
function buildRelay() {
  const root = new THREE.Group();
  const N = 6, ys = Array.from({ length: N }, (_, i) => (i - (N - 1) / 2) * 0.34);
  const L = ys.map((y) => new THREE.Vector3(-2.1, y, 0)), R = ys.map((y) => new THREE.Vector3(2.1, y, 0)), bot = new THREE.Vector3(0, 0, 0);
  const v = []; L.forEach((a) => v.push(a.x, a.y, 0, 0, 0, 0)); R.forEach((a) => v.push(0, 0, 0, a.x, a.y, 0));
  root.add(segs(v, 0xffffff, 0.12));
  const people = dots(N * 2, 0xcfcfd6, 0.12, 0.9);
  [...L, ...R].forEach((p, i) => setP(people, i, p.x, p.y, p.z)); flush(people);
  const pc = miniPC(5); root.add(pc.g, people);
  const msgs = dots(N, 0xffffff, 0.14), reps = dots(N, 0xff3a4a, 0.16); root.add(msgs, reps);
  return {
    root, fov: 34, fx: 2.5, fy: 1.1, ...done(root),
    update(t) {
      for (let i = 0; i < N; i++) {
        const k = (t * 0.32 + i / N) % 1;
        if (k < 0.5) { const f = k * 2; setP(msgs, i, L[i].x * (1 - f), L[i].y * (1 - f), 0); setP(reps, i, 0, -99, 0); }
        else { const f = (k - 0.5) * 2; setP(reps, i, R[i].x * f, R[i].y * f, 0); setP(msgs, i, 0, -99, 0); }
      }
      flush(msgs, reps);
      const k = (t * 0.6) % 1;
      pc.ring.scale.setScalar(1 + k * 1.8); pc.ring.material.opacity = (1 - k) * 0.7;
      pc.led.material.color.setHex(Math.sin(t * 6) > 0 ? 0xff3a4a : 0x7a1220);
      pc.g.rotation.y = Math.sin(t * 0.5) * 0.3;
    },
  };
}

/* Anúncios / tráfego: um funil. Muita gente entra no topo, poucos saem vermelhos (venda). */
function buildFunnel() {
  const root = new THREE.Group(); root.rotation.x = 0.14;
  const top = 1.25, bot = -1.1, rTop = 1.55, rBot = 0.2, rAt = (y) => rBot + (rTop - rBot) * ((y - bot) / (top - bot));
  const v = [];
  for (let k = 0; k <= 7; k++) { const y = bot + ((top - bot) * k) / 7, r = rAt(y); for (let i = 0; i < 64; i++) { const a = (i / 64) * TAU, b = ((i + 1) / 64) * TAU; v.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r); } }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; v.push(Math.cos(a) * rTop, top, Math.sin(a) * rTop, Math.cos(a) * rBot, bot, Math.sin(a) * rBot); }
  root.add(segs(v, 0xffffff, 0.15));
  const N = 760, pts = dots(N, 0xffffff, 0.075, 1, true); root.add(pts);
  const st = Array.from({ length: N }, () => ({ y: rnd(bot - 0.9, top), a: rnd(0, TAU), r: rnd(0.15, 1), sp: rnd(0.35, 0.6), sale: Math.random() < 0.12 }));
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 64 }, (_, i) => new THREE.Vector3(Math.cos((i / 64) * TAU) * 0.3, 0, Math.sin((i / 64) * TAU) * 0.3))), new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.8, blending: add }));
  ring.position.y = bot - 0.5; root.add(ring);
  const col = pts.geometry.attributes.color;
  return {
    root, fov: 34, fx: 1.9, fy: 1.9, ...done(root),
    update(t, dt) {
      st.forEach((p, i) => {
        const h = clamp01((p.y - bot) / (top - bot));
        p.y -= p.sp * dt * (1 + (1 - h) * 1.6); p.a += dt * (0.5 + (1 - h) * 2.4);
        if (p.y < bot - 1.0) { p.y = top + rnd(0, 0.3); p.sale = Math.random() < 0.12; }
        // só quem é "venda" sai pela ponta; os outros se perdem na lateral (saem do funil)
        const inside = p.y > bot, r = inside ? rAt(p.y) * p.r : rBot * p.r * 0.5;
        const drift = !inside && !p.sale ? (bot - p.y) * 1.2 : 0;
        setP(pts, i, Math.cos(p.a) * (r + drift), p.y, Math.sin(p.a) * (r + drift));
        const red = p.sale && p.y < bot + 0.7 ? 1 : p.sale ? 0.45 : 0;
        const dim = !inside && !p.sale ? 0.12 : 0.85;
        col.setXYZ(i, dim, dim * (1 - red * 0.82), dim * (1 - red * 0.78));
      });
      flush(pts);
      const k = (t * 0.7) % 1; ring.scale.setScalar(1 + k * 2.2); ring.material.opacity = (1 - k) * 0.8;
      root.rotation.y = t * 0.12;
    },
  };
}

/* Segurança: escudo em malha, anel de varredura e ameaças que batem e se desfazem. */
function buildShield() {
  const root = new THREE.Group();
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1, 1)), new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.5, blending: add }));
  root.add(edges);
  const core = dots(520, 0xe8e8ee, 0.04, 0.8); const c = new THREE.Vector3();
  for (let i = 0; i < 520; i++) { c.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(0.5); setP(core, i, c.x, c.y, c.z); }
  flush(core); root.add(core);
  const scan = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 90 }, (_, i) => new THREE.Vector3(Math.cos((i / 90) * TAU), 0, Math.sin((i / 90) * TAU)))), new THREE.LineBasicMaterial({ color: 0xff6a78, transparent: true, opacity: 0.9, blending: add }));
  root.add(scan);
  const N = 40, threats = dots(N, 0xff2f40, 0.1), st = Array.from({ length: N }, () => ({ d: new THREE.Vector3(rnd(-1, 1), rnd(-0.6, 0.6), rnd(-1, 1)).normalize(), r: rnd(1.4, 3.6), sp: rnd(0.5, 1.1) }));
  root.add(threats);
  let flash = 0;
  return {
    root, fov: 34, fx: 1.95, fy: 1.55, ...done(root),
    update(t, dt) {
      st.forEach((p, i) => {
        p.r -= p.sp * dt;
        if (p.r < 1.1) { flash = 1; p.d.set(rnd(-1, 1), rnd(-0.6, 0.6), rnd(-1, 1)).normalize(); p.r = rnd(2.8, 3.8); }
        setP(threats, i, p.d.x * p.r, p.d.y * p.r, p.d.z * p.r);
      });
      flush(threats);
      flash = Math.max(0, flash - dt * 2.5);
      edges.material.opacity = 0.42 + flash * 0.5;
      const y = Math.sin(t * 0.9) * 0.92, rr = Math.sqrt(Math.max(0.02, 1 - y * y)) * 1.12;
      scan.position.y = y; scan.scale.set(rr, 1, rr);
      root.rotation.y = t * 0.2; root.rotation.x = 0.25;
    },
  };
}

/* Loja / e-commerce: pedidos viajam numa esteira até o carrinho, enquanto visitantes chegam. */
function buildConveyor() {
  const root = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.4, -0.3, 0), new THREE.Vector3(-0.9, 0.05, 0.35), new THREE.Vector3(0.6, -0.2, 0), new THREE.Vector3(1.5, -0.3, 0)]);
  root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 })));
  const bg = new THREE.BoxGeometry(0.24, 0.24, 0.24), eg = new THREE.EdgesGeometry(bg);
  const boxes = Array.from({ length: 7 }, (_, i) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0x17171b })), new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0xf2f2f2 })));
    root.add(g); return { g, ph: i / 7 };
  });
  const cart = new THREE.Group();
  const cb = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 0.42, 0.55));
  cart.add(new THREE.LineSegments(cb, new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 0.9, blending: add })));
  for (const sx of [-0.28, 0.28]) { const w = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 24 }, (_, i) => new THREE.Vector3(Math.cos((i / 24) * TAU) * 0.09, -0.3 + Math.sin((i / 24) * TAU) * 0.09, 0.3))), new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.7 })); w.position.x = sx; cart.add(w); }
  cart.position.set(2.0, -0.15, 0); root.add(cart);
  const vis = dots(80, 0xffffff, 0.06, 0.8), vs = Array.from({ length: 80 }, () => ({ ph: rnd(), sp: rnd(0.12, 0.22), o: new THREE.Vector3(rnd(-0.18, 0.18), rnd(0.1, 0.55), rnd(-0.2, 0.2)) }));
  root.add(vis);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 40), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: add, depthWrite: false }));
  ring.position.copy(cart.position); root.add(ring);
  const p = new THREE.Vector3();
  return {
    root, fov: 34, fx: 2.7, fy: 1.1, ...done(root),
    update(t) {
      boxes.forEach((b) => {
        const k = (t * 0.085 + b.ph) % 1;
        curve.getPoint(Math.min(1, k * 1.04), p); b.g.position.copy(p); b.g.position.y += 0.12;
        b.g.rotation.y = k * 3; b.g.scale.setScalar(Math.max(0.0001, 1 - smooth(0.82, 1.0, k)));
        b.g.children[1].material.color.setHex(k > 0.65 ? 0xff4a5c : 0xf2f2f2);
      });
      vs.forEach((v, i) => { const k = (t * v.sp + v.ph) % 1; curve.getPoint(Math.min(1, k), p); setP(vis, i, p.x + v.o.x, p.y + v.o.y * (1 - k), p.z + v.o.z); });
      flush(vis);
      const k = (t * 0.6) % 1; ring.scale.setScalar(1 + k * 1.2); ring.material.opacity = (1 - k) * 0.7; ring.rotation.x = -Math.PI / 2;
      root.rotation.y = Math.sin(t * 0.3) * 0.2; root.rotation.x = 0.18;
    },
  };
}

/* Pousada / reservas: prédio com janelas que acendem a cada reserva que chega pelos canais. */
function buildBuilding() {
  const root = new THREE.Group();
  root.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 1.8, 0.8)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })));
  const COLS = 5, ROWS = 4, W = COLS * ROWS, win = dots(W, 0xffffff, 0.2, 1, true); root.add(win);
  const wp = []; for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) wp.push(new THREE.Vector3(-0.88 + i * 0.44, -0.62 + j * 0.44, 0.42));
  wp.forEach((v, i) => setP(win, i, v.x, v.y, v.z)); flush(win);
  const lit = new Float32Array(W).fill(-99); [3, 8, 12, 17].forEach((i) => { lit[i] = -2; });
  const roof = new THREE.Vector3(0, 0.95, 0), srcs = [new THREE.Vector3(-2.2, 0.25, 0), new THREE.Vector3(2.2, 0.25, 0)];
  const pcs = srcs.map((s) => { const m = miniPC(3); m.g.position.copy(s); root.add(m.g); return m; });
  const curves = srcs.map((s) => new THREE.QuadraticBezierCurve3(s.clone(), new THREE.Vector3(s.x * 0.5, 1.9, 0), roof.clone()));
  curves.forEach((c) => root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(40)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14 }))));
  const pk = dots(3, 0xffd5da, 0.16); root.add(pk);
  const jobs = []; let next = 0.6; const col = win.geometry.attributes.color, p = new THREE.Vector3();
  return {
    root, fov: 34, fx: 2.7, fy: 1.45, ...done(root),
    update(t) {
      if (t > next) { next = t + rnd(1.1, 1.7); if (jobs.length < 3) jobs.push({ side: (Math.random() * 2) | 0, t0: t }); }
      for (let k = 0; k < 3; k++) {
        const j = jobs[k];
        if (!j) { setP(pk, k, 0, -99, 0); continue; }
        const f = (t - j.t0) / 1.3;
        if (f >= 1) { const free = lit.map((v, i) => (t - v > 8 ? i : -1)).filter((i) => i >= 0); if (free.length) lit[free[(Math.random() * free.length) | 0]] = t; jobs.splice(k, 1); k--; continue; }
        curves[j.side].getPoint(f, p); setP(pk, k, p.x, p.y, p.z);
      }
      for (let i = 0; i < W; i++) { const on = t - lit[i] < 8 ? 1 : 0.1; col.setXYZ(i, on, on * (on > 0.5 ? 0.3 : 1), on * (on > 0.5 ? 0.35 : 1)); }
      flush(pk, win);
      pcs.forEach((m, i) => { const k = (t * 0.4 + i * 0.5) % 1; m.ring.scale.setScalar(1 + k * 1.6); m.ring.material.opacity = (1 - k) * 0.6; });
      root.rotation.y = Math.sin(t * 0.3) * 0.22;
    },
  };
}

/* Prospecção: radar varre o mercado; cada lead encontrado recebe a primeira mensagem. */
function buildRadar() {
  const root = new THREE.Group(), disc = new THREE.Group(); disc.rotation.x = -1.05; root.add(disc);
  [0.5, 1, 1.5].forEach((r) => disc.add(segs(circle(r), 0xffffff, 0.2)));
  disc.add(segs([-1.5, 0, 0, 1.5, 0, 0, 0, -1.5, 0, 0, 1.5, 0], 0xffffff, 0.12));
  const sweep = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28, 0, 0.55), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.2, side: THREE.DoubleSide, blending: add, depthWrite: false }));
  disc.add(sweep);
  const N = 26, leads = Array.from({ length: N }, () => { const a = rnd(0, TAU), r = rnd(0.18, 1.42); return { a, p: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0), found: -99 }; });
  const pts = dots(N, 0xffffff, 0.09, 1, true); disc.add(pts);
  const links = segs(new Array(N * 6).fill(0), RED, 0.8); links.material.blending = add; disc.add(links);
  const msg = dots(N, 0xffd5da, 0.12); disc.add(msg);
  const col = pts.geometry.attributes.color, lp = links.geometry.attributes.position;
  return {
    root, fov: 34, fx: 1.8, fy: 1.45, ...done(root),
    update(t) {
      const a = t * 1.1; sweep.rotation.z = a;
      leads.forEach((l, i) => {
        const diff = (((a + 0.55 - l.a) % TAU) + TAU) % TAU;
        if (diff < 0.14 && t - l.found > 10) l.found = t;
        const age = t - l.found, on = age < 9;
        setP(pts, i, l.p.x, l.p.y, 0); col.setXYZ(i, on ? 1 : 0.3, on ? 0.2 : 0.3, on ? 0.28 : 0.34);
        lp.setXYZ(i * 2, 0, 0, 0); lp.setXYZ(i * 2 + 1, on ? l.p.x * Math.min(1, age * 1.6) : 0, on ? l.p.y * Math.min(1, age * 1.6) : 0, 0);
        const f = age * 0.7; setP(msg, i, on && f < 1 ? l.p.x * f : 0, on && f < 1 ? l.p.y * f : 0, on && f < 1 ? 0 : -99);
      });
      flush(pts, msg); lp.needsUpdate = true;
      root.rotation.z = Math.sin(t * 0.2) * 0.15;
    },
  };
}

/* ---------- Definição das cenas ---------- */
const BUILDERS = {
  'globe-hero': () => buildGlobe({ points: 22000, sats: 7, intro: true, mouse: true, pcScale: 0.72, fx: 1.95, fy: 1.95 }),
  'globe-cases': () => buildGlobe({ points: 7000, sats: 2, intro: true, cities: ['sp', 'ny', 'lon', 'dxb', 'syd'],
    links: [['sp', 'ny'], ['ny', 'lon'], ['lon', 'dxb'], ['dxb', 'syd'], ['sp', 'lon'], ['syd', 'sp']], pcScale: 1.1, fx: 1.75, fy: 1.75 }),
  beacon: () => buildGlobe({ points: 9000, sats: 4, intro: true, beacon: 'sp', alpha: 0.3, pcScale: 0.8, fx: 1.5, fy: 1.5,
    cities: ['sp', 'ny', 'lon', 'lag', 'jnb', 'dxb', 'bom', 'sin', 'tyo', 'syd', 'la', 'mow'],
    links: ['ny', 'lon', 'lag', 'jnb', 'dxb', 'bom', 'sin', 'tyo', 'syd', 'la', 'mow', 'ba'].map((k) => [k, 'sp']).filter(([k]) => k !== 'ba') }),
  constellation: buildConstellation,
  pipeline: buildPipeline,
  // cenas dos posts do blog (uma por assunto)
  'globe-news': () => buildGlobe({ points: 14000, sats: 3, intro: true, fx: 2.2, fy: 1.5 }),
  neural: buildNeural, relay: buildRelay, funnel: buildFunnel, shield: buildShield,
  conveyor: buildConveyor, building: buildBuilding, radar: buildRadar,
};

/* ---------- Montagem ---------- */
export function mountScenes({ canvas, state, onReady, onFail, watchdog = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;

  const slots = Array.from(document.querySelectorAll('[data-scene]')).map((el) => {
    const make = BUILDERS[el.dataset.scene];
    if (!make) return null;
    const def = make();
    const scene = new THREE.Scene();
    scene.add(def.root);
    const camera = new THREE.PerspectiveCamera(def.fov, 1, 0.1, 60);
    return { el, def, scene, camera, born: -1, kind: el.dataset.scene, smoothS: 0 };
  }).filter(Boolean);

  let W = 0, H = 0, dpr = 1;
  const fit = () => {
    W = document.documentElement.clientWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
  };
  fit();
  let rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(fit, 150); };
  addEventListener('resize', onResize);

  const mouse = { x: 0, y: 0 }, mouseT = { x: 0, y: 0 };
  const onMove = (e) => { mouseT.x = (e.clientX / innerWidth) * 2 - 1; mouseT.y = -((e.clientY / innerHeight) * 2 - 1); };
  addEventListener('pointermove', onMove, { passive: true });

  let tabOn = !document.hidden, raf = 0, running = false, dead = false, ready = false;
  const onVis = () => { tabOn = !document.hidden; sync(); };
  document.addEventListener('visibilitychange', onVis);

  let prev = performance.now(), simT = 0, slow = 0, seen = 0, drew = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
    simT += dt;
    mouse.x += (mouseT.x - mouse.x) * (1 - Math.exp(-dt * 6));
    mouse.y += (mouseT.y - mouse.y) * (1 - Math.exp(-dt * 6));

    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    let any = 0;
    for (const s of slots) {
      const r = s.el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
      any++;
      if (s.born < 0) s.born = simT; // a cena "nasce" (partículas chegando) quando entra na tela
      const aspect = r.width / r.height, tan = Math.tan((s.def.fov * Math.PI) / 360);
      const dist = Math.max(s.def.fy / tan, s.def.fx / (tan * Math.min(aspect, 2.2)));
      const hero = s.kind === 'globe-hero';
      s.smoothS += ((hero ? state.p : 0) - s.smoothS) * (1 - Math.exp(-dt * 10));
      s.camera.aspect = aspect;
      s.camera.position.set(0, 0, dist + s.smoothS * 3.2);
      s.camera.updateProjectionMatrix();
      if (hero) { // tela larga: o planeta vai para a direita (o texto fica à esquerda)
        const visW = 2 * tan * dist * aspect;
        s.def.root.position.x = aspect > 1.15 ? visW * 0.235 : 0;
        s.def.root.position.y = aspect > 1.15 ? -0.1 : 0.5;
      }
      if (s.def.U) s.def.U.uScale.value = (r.height * dpr) / (2 * tan);
      s.def.update(simT, dt, { scroll: s.smoothS, age: simT - s.born, mouse, state });
      const y = H - r.bottom;
      renderer.setViewport(r.left, y, r.width, r.height);
      renderer.setScissor(Math.max(0, r.left), Math.max(0, y), Math.min(r.width, W), Math.min(r.height, H));
      renderer.render(s.scene, s.camera);
    }
    if (!ready) { ready = true; onReady && onReady(); }

    // vigia de fps: se o 3D ficar lento, desiste e volta ao fallback sem 3D
    if (watchdog && any) {
      drew += dt; seen += dt; slow += dt > 1 / 28 ? dt : 0;
      if (drew > 3 && seen > 2.5) { if (slow / seen > 0.6) { destroy(); onFail && onFail(); return; } seen = 0; slow = 0; }
    }
  }
  function sync() {
    const should = tabOn && !dead;
    if (should && !running) { running = true; prev = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!should && running) { running = false; cancelAnimationFrame(raf); }
  }
  sync();

  function destroy() {
    if (dead) return;
    dead = true; running = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVis);
    removeEventListener('resize', onResize);
    removeEventListener('pointermove', onMove);
    clearTimeout(rt);
    slots.forEach((s) => s.def.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return destroy;
}
