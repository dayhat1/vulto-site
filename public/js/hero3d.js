/* =========================================================================
   VULTO · hero 3D
   Uma forma escura que respira, com contorno de luz vermelha (fresnel),
   um anel orbitando e partículas de "dados" subindo devagar. Reage ao
   mouse com parallax sutil. Pausa fora da tela e com a aba oculta.
   Carregado só por vulto.js, só no desktop.
   ========================================================================= */
import * as THREE from './vendor/three.module.min.js';

const RED = new THREE.Color('#e3172e');
const RED_SOFT = new THREE.Color('#ff4a5c');
const BG = new THREE.Color('#0b090a');

const VERT = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vWarp;
  void main() {
    vec3 p = position;
    float t = uTime * 0.35;
    float w = sin(p.x * 2.6 + t) * sin(p.y * 2.2 + t * 1.3) * sin(p.z * 2.9 + t * 0.8);
    w += 0.5 * sin(p.y * 5.1 - t * 1.7) * sin(p.x * 4.3 + t);
    p += normal * w * 0.09;
    vWarp = w;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uRed;
  uniform vec3 uRedSoft;
  uniform float uPulse;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vWarp;
  void main() {
    float f = 1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0);
    float rim = pow(f, 2.6);
    vec3 core = vec3(0.045, 0.03, 0.035) + vec3(0.05, 0.0, 0.01) * (vWarp + 0.5);
    vec3 col = mix(core, uRed, rim * 1.15) + uRedSoft * pow(f, 7.0) * (0.55 + 0.45 * uPulse);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function initHero3D(hero) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-3d';
  canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.075);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  /* O vulto */
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.75, 48),
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uRed: { value: RED }, uRedSoft: { value: RED_SOFT }, uPulse: { value: 0 } },
      fog: false,
    })
  );
  const group = new THREE.Group();
  group.add(body);

  /* Anel orbitando */
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.55, 0.008, 8, 220),
    new THREE.MeshBasicMaterial({ color: RED_SOFT, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = Math.PI * 0.42;
  ring.rotation.y = -0.25;
  group.add(ring);
  const ring2 = ring.clone();
  ring2.material = ring.material.clone();
  ring2.material.opacity = 0.22;
  ring2.scale.setScalar(1.22);
  ring2.rotation.x = Math.PI * 0.58;
  ring2.rotation.y = 0.4;
  group.add(ring2);
  scene.add(group);

  /* Partículas de dados subindo */
  const COUNT = 700;
  const pos = new Float32Array(COUNT * 3);
  const speed = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    speed[i] = 0.12 + Math.random() * 0.35;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(
    pgeo,
    new THREE.PointsMaterial({ color: RED_SOFT, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  scene.add(dots);

  /* Layout: o vulto fica atrás da coluna do celular (direita) */
  const layout = () => {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visibleW = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z * camera.aspect;
    group.position.set(visibleW * 0.27, 0.15, 0);
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(hero);

  /* Mouse → parallax (máx. ~8°) */
  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('pointermove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* Loop com pausa fora da tela / aba oculta */
  const clock = new THREE.Clock();
  let visible = true;
  let running = false;
  let raf = 0;
  const MAXR = THREE.MathUtils.degToRad(8);

  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    cx += (tx - cx) * 0.04;
    cy += (ty - cy) * 0.04;

    body.material.uniforms.uTime.value = t;
    body.material.uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(t * 0.9);
    body.rotation.y = t * 0.08 + cx * MAXR;
    body.rotation.x = cy * MAXR * 0.8;
    ring.rotation.z = t * 0.12;
    ring2.rotation.z = -t * 0.07;
    group.rotation.y = cx * MAXR * 0.5;
    group.rotation.x = cy * MAXR * 0.4;
    camera.position.x = cx * 0.25;
    camera.position.y = -cy * 0.18;
    camera.lookAt(group.position.x * 0.35, 0, 0);

    const a = pgeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      a[i * 3 + 1] += speed[i] * dt;
      if (a[i * 3 + 1] > 6) a[i * 3 + 1] = -6;
    }
    pgeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  };
  const start = () => { if (!running && visible && !document.hidden) { running = true; clock.getDelta(); frame(); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  start();
  requestAnimationFrame(() => canvas.classList.add('ready'));
}
