import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildWorld, type Interactable } from './world';
import { Player } from './player';
import { UI, type Quality } from './ui';
import './style.css';

const isTouch = 'ontouchstart' in window && navigator.maxTouchPoints > 0;

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const world = buildWorld(scene);
const player = new Player(renderer.domElement);

// ---------- post-processing ----------
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
  type: THREE.HalfFloatType,
  samples: 4,
});
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, player.camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.55, 0.82);
composer.addPass(bloom);

// restrained grade: slight vignette + gentle lift of shadow warmth
const gradePass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.42 },
    warmth: { value: 0.035 },
    contrast: { value: 1.045 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float warmth;
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      // mild S-curve contrast
      c.rgb = (c.rgb - 0.5) * contrast + 0.5;
      // warm the shadows a touch
      float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb += vec3(warmth, warmth * 0.55, 0.0) * (1.0 - lum);
      // vignette
      vec2 d = vUv - 0.5;
      float v = 1.0 - vignette * dot(d, d) * 1.8;
      c.rgb *= v;
      gl_FragColor = c;
    }
  `,
});
composer.addPass(gradePass);
composer.addPass(new OutputPass());

// ---------- quality tiers ----------
function applyQuality(q: Quality) {
  const dpr = window.devicePixelRatio || 1;
  if (q === 'low') {
    renderer.setPixelRatio(1);
    bloom.enabled = false;
    gradePass.enabled = false;
    renderer.shadowMap.enabled = false;
    world.shadowLights.forEach((s) => (s.castShadow = false));
    world.dust.visible = false;
  } else if (q === 'medium') {
    renderer.setPixelRatio(Math.min(dpr, 1.5));
    bloom.enabled = true;
    gradePass.enabled = true;
    renderer.shadowMap.enabled = true;
    world.shadowLights.forEach((s, i) => (s.castShadow = i % 2 === 0));
    world.dust.visible = true;
  } else {
    renderer.setPixelRatio(Math.min(dpr, 2));
    bloom.enabled = true;
    gradePass.enabled = true;
    renderer.shadowMap.enabled = true;
    world.shadowLights.forEach((s) => (s.castShadow = true));
    world.dust.visible = true;
  }
  // shadows need a material refresh when toggled
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (m) m.needsUpdate = true;
  });
}

// ---------- UI ----------
const ui = new UI({
  isTouch,
  onEnter: () => {
    if (!isTouch) player.requestLock();
  },
  onQuality: applyQuality,
});
applyQuality(isTouch ? 'low' : 'medium');
if (isTouch) ui.setPrompt(null);

// keep hint legible but dim after entering
ui.onCardClosed = () => {
  if (!isTouch) player.requestLock();
};

// click empty space → re-lock pointer (standard museum UX)
renderer.domElement.addEventListener('click', () => {
  if (!isTouch && !ui.cardOpen && !player.locked) player.requestLock();
});

// ---------- interaction ----------
const ray = new THREE.Raycaster();
ray.far = 3.4;
const center = new THREE.Vector2(0, 0);
let hovered: Interactable | null = null;

function openCard() {
  if (!hovered) return;
  ui.openCard(hovered.userData.project);
  if (document.pointerLockElement) document.exitPointerLock();
}

addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') {
    if (ui.cardOpen) ui.closeCard();
    else openCard();
  }
  if (e.code === 'Escape' && ui.cardOpen) ui.closeCard();
});
renderer.domElement.addEventListener('mousedown', () => {
  if (player.locked && hovered) openCard();
});
// touch: tap while prompt is up opens card
renderer.domElement.addEventListener('touchend', (e) => {
  if (isTouch && hovered && !ui.cardOpen && e.changedTouches.length === 1) {
    const t = e.changedTouches[0];
    if (Math.abs(t.clientX - innerWidth / 2) < innerWidth / 3) openCard();
  }
});

// ---------- room zone titles ----------
function currentZone(): string {
  const p = player.pos;
  for (const z of world.zones) {
    if (p.x >= z.minX && p.x <= z.maxX && p.z >= z.minZ && p.z <= z.maxZ) return z.name;
  }
  return 'The Corridor';
}

// ---------- resize ----------
addEventListener('resize', () => {
  player.camera.aspect = innerWidth / innerHeight;
  player.camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// dev/debug handle (harmless in prod)
(window as unknown as Record<string, unknown>).__dbg = {
  player,
  world,
  teleport(x: number, z: number, yaw: number) {
    player.pos.set(x, 1.62, z);
    player.targetYaw = yaw;
    player.targetPitch = 0;
    player.yaw = yaw;
    player.pitch = 0;
  },
};

// ---------- loop ----------
const clock = new THREE.Clock();
let frames = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  player.update(dt, world.colliders);

  // slow dust drift
  world.dust.rotation.y += dt * 0.006;
  world.dust.position.y = Math.sin(clock.elapsedTime * 0.11) * 0.12;

  // interaction probe
  ray.setFromCamera(center, player.camera);
  const hits = ray.intersectObjects(world.interactables, false);
  hovered = (hits[0]?.object as Interactable) ?? null;
  ui.setPrompt(hovered && !ui.cardOpen ? (isTouch ? 'Tap — view exhibit' : 'E — view exhibit') : null);
  ui.setRoom(currentZone());

  composer.render();
  frames++;
  requestAnimationFrame(tick);
}
tick();
