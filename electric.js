import * as THREE from 'three';
import { OBJLoader } from './vendor/OBJLoader.js';
import { OriginalLightningMaterial, ORIGINAL_MOTION, ORIGINAL_SCENE } from './lightning-original.js';

// Original assets, shader, lifetime envelope, 3D rotations and emission timing.
// Only the host and the portfolio's spawn area differ from the reference scene.
const canvas = document.querySelector('#electric');
const hero = document.querySelector('.hero');
const button = document.querySelector('#motion');
const original = canvas.dataset.mode === 'original';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const motion = original ? ORIGINAL_MOTION : {
  ...ORIGINAL_MOTION,
  lineWidth: ORIGINAL_MOTION.lineWidth * .72 + .03,
  edgeWidth: ORIGINAL_MOTION.edgeWidth * 1.05,
  textureSpeed: ORIGINAL_MOTION.textureSpeed * .5,
  lifetimeBase: ORIGINAL_MOTION.lifetimeBase * 2,
  lifetimeVariance: ORIGINAL_MOTION.lifetimeVariance * 2
};
let renderer, material, meshes = [], slots = [];
let elapsed = 0, previous = 0, raf = 0, paused = reduced.matches;
let visible = true, ready = false, cursor = 0, sceneConfig;
let lastBurst = 0, lastEmission = 0, nextBurst = 0, queued = ORIGINAL_SCENE.burstCount;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 16 / 9, .1, 1000);
camera.position.set(0, 0, 1);
const transform = new THREE.Object3D();
const random = ([min, max]) => min + Math.random() * (max - min);
const targetColor = new THREE.Color(56 / 255, 107 / 255, 1);
let sectionObserver;
const colorSections = [...document.querySelectorAll('[data-lightning-color]')];

function selectSection(section) {
  const hex = section.dataset.lightningColor;
  document.documentElement.style.setProperty("--active-lightning", hex);
  // This original custom shader outputs its RGB directly (no output color-space chunk).
  targetColor.setRGB(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
  canvas.dataset.section = section.id || (section.tagName === 'FOOTER' ? 'contact' : 'work');
  canvas.dataset.color = hex;
  if (ready && paused) { material.uniforms.uColor.value.copy(targetColor); render(); }
}
function observeSections() {
  if (original) return;
  sectionObserver?.disconnect();
  const intersecting = new Set();
  // A 1px observation band at 55% of the viewport: independent of section height.
  // Pixel margins avoid percentage rootMargin being resolved against viewport width.
  const height = document.documentElement.clientHeight;
  const line = Math.round(height * .55);
  sectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) intersecting.add(entry.target);
      else intersecting.delete(entry.target);
    }
    const active = colorSections.filter(section => intersecting.has(section)).at(-1);
    if (active) selectSection(active);
  }, { rootMargin: `-${line}px 0px -${Math.max(0, height - line - 1)}px 0px`, threshold: 0 });
  colorSections.forEach(section => sectionObserver.observe(section));
}
if (!original && button) {
  button.classList.add('fixed-motion');
  document.body.append(button);
}

function fallback(error) {
  cancelAnimationFrame(raf);
  console.error('Lightning initialization failed:', error);
  hero?.classList.add('fallback');
  canvas.hidden = true;
  if (button) button.hidden = true;
}
function updateButton() {
  if (!button) return;
  button.setAttribute('aria-pressed', String(paused));
  button.setAttribute('aria-label', paused ? 'アニメーションを再生' : 'アニメーションを停止');
  button.querySelector('span').textContent = paused ? 'OFF' : 'ON';
  button.querySelector('b').textContent = paused ? '▷' : 'Ⅱ';
}
function resize() {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  // The reference scene's exact settings remain available at lightning-reference.html.
  // Portfolio mode preserves its appearance, with discharges distributed across the entire main visual.
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(75 / 2));
  const halfWidth = halfHeight * camera.aspect;
  sceneConfig = original ? ORIGINAL_SCENE : {
    ...ORIGINAL_SCENE,
    bounds: { x: [-halfWidth * .98, halfWidth * .98], y: [-halfHeight * .98, halfHeight * .98], z: [.04, .08] },
    scaleRange: width < 500 ? [.28, .48] : [.36, .59]
  };
  if (ready) render();
  observeSections();
}
function spawn(now) {
  const limit = sceneConfig.maxInstances;
  const slot = slots.find(s => !s.active) || (original ? slots[cursor % limit] : null);
  // Let every ribbon finish fading instead of replacing a visible instance.
  if (!slot) return;
  cursor = (cursor + 1) % limit;
  const scale = random(sceneConfig.scaleRange);
  const { bounds } = sceneConfig;
  // Keep the current width dominant; choose a width once per discharge.
  const widthRoll = Math.random();
  const widthVariant = widthRoll < .75 ? 0 : widthRoll < .875 ? 1 : 2;
  Object.assign(slot, {
    active: true,
    geometryIndex: original
      ? Math.floor(Math.random() * meshes.length)
      : Math.floor(Math.random() * (meshes.length / 3)) * 3 + widthVariant,
    startTime: now,
    lifetime: Math.random() * motion.lifetimeVariance + motion.lifetimeBase,
    position: [random(bounds.x), random(bounds.y), random(bounds.z)],
    rotation: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2],
    scale: [scale, scale * (1 + Math.random() * motion.scaleYVariance), scale]
  });
}
function emit() {
  if (elapsed - lastEmission >= 1 / sceneConfig.rateOverTime) {
    spawn(elapsed); lastEmission = elapsed;
  }
  if (elapsed - lastBurst >= sceneConfig.burstInterval) {
    lastBurst = elapsed;
    queued = Math.min(queued + sceneConfig.burstCount, sceneConfig.maxInstances);
    nextBurst = Math.min(nextBurst, lastBurst);
  }
  if (queued > 0 && elapsed >= nextBurst) {
    spawn(elapsed); queued--; nextBurst = elapsed + motion.burstSpawnInterval;
  }
}
function render() {
  const counts = meshes.map(() => 0);
  material.setTime(elapsed);
  for (const slot of slots) {
    if (!slot.active) continue;
    const progress = Math.min((elapsed - slot.startTime) / slot.lifetime, 1);
    if (progress >= 1) { slot.active = false; continue; }
    // Lightning ribbons ease into view and fade gently; reference mode retains its envelope.
    const threshold = !original
      ? .94 * (progress < .24
        ? THREE.MathUtils.smoothstep(progress, 0, .24)
        : 1 - THREE.MathUtils.smoothstep(progress, .24, 1))
      : progress < motion.thresholdAttackProgress
      ? progress * motion.thresholdAttackScale
      : motion.thresholdDecayScale * (1 - (progress - motion.thresholdAttackProgress) / (1 - motion.thresholdAttackProgress));
    const mesh = meshes[slot.geometryIndex], index = counts[slot.geometryIndex]++;
    transform.position.fromArray(slot.position);
    transform.rotation.set(...slot.rotation);
    transform.scale.fromArray(slot.scale);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.geometry.getAttribute('aThreshold').setX(index, threshold);
  }
  meshes.forEach((mesh, index) => {
    mesh.count = counts[index];
    mesh.visible = mesh.count > 0;
    if (mesh.visible) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.geometry.getAttribute('aThreshold').needsUpdate = true;
    }
  });
  renderer.render(scene, camera);
}
function tick(now) {
  raf = 0;
  if (!ready || paused || !visible || document.hidden) return;
  const delta = previous ? Math.min((now - previous) / 1000, .05) : 0;
  elapsed += delta;
  if (!original) material.uniforms.uColor.value.lerp(targetColor, 1 - Math.exp(-delta * 9));
  previous = now;
  emit(); render();
  raf = requestAnimationFrame(tick);
}
function schedule() {
  cancelAnimationFrame(raf); previous = 0;
  if (ready && !paused && visible && !document.hidden) raf = requestAnimationFrame(tick);
}
function staticPose() {
  // A useful frozen frame rather than an empty canvas for reduced-motion users.
  for (let i = 0; i < 5; i++) spawn(elapsed);
  for (const slot of slots) if (slot.active) slot.startTime = elapsed - slot.lifetime * .13;
  render();
}
// Sharp, irregular turns with joined ribbon edges (no gaps at the corners).
function createJaggedLightning(variant, widthScale = 1) {
  const coordinates = variant === 0
    ? [[-1.2,-.16,0],[-.91,.08,.02],[-.73,-.12,.03],[-.42,.30,.02],[-.22,.03,0],[.10,.42,-.02],[.03,.06,-.02],[.49,-.25,0],[.68,.04,.02],[.87,-.18,.03],[1.2,.12,.04]]
    : [[-1.2,.20,0],[-.94,-.10,.02],[-.66,.14,.03],[-.46,-.35,.02],[-.16,-.10,0],[.12,-.43,-.02],[.04,-.02,0],[.42,.32,.02],[.65,.10,.02],[.83,.35,.03],[1.2,-.08,0]];
  const points = coordinates.map(p => new THREE.Vector3(...p));
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + points[i].distanceTo(points[i - 1]));
  const total = distances[distances.length - 1];
  const vertices = [], uvs = [], along = [], indices = [];
  const normalOf = tangent => new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
  for (let i = 0; i < points.length; i++) {
    const t = distances[i] / total;
    const point = points[i];
    const incoming = points[i].clone().sub(points[Math.max(0, i - 1)]);
    const outgoing = points[Math.min(points.length - 1, i + 1)].clone().sub(points[i]);
    if (i === 0) incoming.copy(outgoing);
    if (i === points.length - 1) outgoing.copy(incoming);
    const nextNormal = normalOf(outgoing);
    const normal = normalOf(incoming).add(nextNormal).normalize();
    const miter = Math.min(2.2, 1 / Math.max(.1, normal.dot(nextNormal)));
    const halfWidth = .065 * widthScale * (.12 + .88 * Math.pow(Math.sin(Math.PI * t), .65));
    for (const side of [-1, 1]) {
      const edge = point.clone().addScaledVector(normal, halfWidth * side * miter);
      vertices.push(edge.x, edge.y, edge.z);
      uvs.push(t, (side + 1) / 2);
      along.push(t);
    }
    if (i < points.length - 1) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aLightningAlong', new THREE.Float32BufferAttribute(along, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
async function init() {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); // Matches the reference lightning overlay.
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const loader = new OBJLoader();
  const [objects, texture] = await Promise.all([
    Promise.all(['tapered-01.obj', 'tapered-02.obj'].map(file => loader.loadAsync(`./assets/lightning/${file}`))),
    new THREE.TextureLoader().loadAsync('./assets/lightning/lightning.png')
  ]);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  material = new OriginalLightningMaterial(texture, motion.textureSpeed);
  material.setColor('#FF481B');
  if (!original) material.uniforms.uColor.value.setRGB(56 / 255, 107 / 255, 1);
  material.setEdgeColor(ORIGINAL_SCENE.edgeColor);
  material.setLineWidth(motion.lineWidth);
  material.setEdgeWidth(motion.edgeWidth);
  material.setEdgeSoftness(motion.edgeSoftness);
  material.setTipAlphaPower(motion.tipAlphaPower);
  material.setTipFadeLength(motion.tipFadeLength);
  material.setTipMinWidthScale(motion.tipMinWidthScale);
  const shapes = objects.flatMap((object, variant) =>
    (original ? [1] : [1, .72, 2.4]).map(widthScale => ({ object, variant, widthScale }))
  );
  meshes = shapes.map(({ object, variant, widthScale }) => {
    const geometry = original ? object.children.find(child => child.isMesh)?.geometry : createJaggedLightning(variant, widthScale);
    if (!geometry) throw new Error('Missing lightning mesh');
    const uv = geometry.getAttribute('uv'), positions = geometry.getAttribute('position');
    const value = i => uv ? uv.getX(i) : positions.getX(i);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < positions.count; i++) { min = Math.min(min, value(i)); max = Math.max(max, value(i)); }
    const along = Float32Array.from({ length: positions.count }, (_, i) => max === min ? .5 : (value(i) - min) / (max - min));
    geometry.setAttribute('aLightningAlong', new THREE.BufferAttribute(along, 1));
    geometry.setAttribute('aThreshold', new THREE.InstancedBufferAttribute(new Float32Array(ORIGINAL_SCENE.maxInstances), 1).setUsage(THREE.DynamicDrawUsage));
    const mesh = new THREE.InstancedMesh(geometry, material, ORIGINAL_SCENE.maxInstances);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 2;
    scene.add(mesh);
    return mesh;
  });
  slots = Array.from({ length: ORIGINAL_SCENE.maxInstances }, () => ({ active: false }));
  resize(); ready = true;
  if (paused) staticPose();
  updateButton(); schedule();
  canvas.dataset.ready = 'true';
  new ResizeObserver(resize).observe(canvas);
  if (original) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }).observe(canvas);
}
button?.addEventListener('click', () => { paused = !paused; updateButton(); schedule(); });
reduced.addEventListener('change', () => { paused = reduced.matches; updateButton(); if (ready && paused) staticPose(); schedule(); });
document.addEventListener('visibilitychange', schedule);
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(new Error('WebGL context lost')); });
init().catch(fallback);
