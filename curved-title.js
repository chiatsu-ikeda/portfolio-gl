// Real CSS 3D transforms keep the existing live font; no image or alternate typeface.
const title = document.querySelector('.hero-title-type');
const lines = ['FROM DESIGN', 'TO EXPERIENCE.'];
const measure = document.createElement('canvas').getContext('2d');
let lastSize = '';
function buildTitle() {
  const style = getComputedStyle(title);
  const size = parseFloat(style.fontSize);
  const signature = `${size}/${style.fontFamily}`;
  if (signature === lastSize) return;
  lastSize = signature;
  measure.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
  const spacing = size * .005;
  const widths = lines.map(line => measure.measureText(line).width + spacing * (line.length - 1));
  const width = Math.max(...widths);
  const radius = width * .55;
  const depth = size * .38;
  const stage = document.createElement('span');
  stage.className = 'title-sphere';
  stage.setAttribute('aria-hidden', 'true');
  title.style.width = `${width + size * .35}px`;
  title.style.height = `${size * 2.55}px`;
  title.style.perspective = `${width * .9}px`;
  lines.forEach((line, row) => {
    [...line].forEach((character, index) => {
      if (character === ' ') return;
      const charWidth = measure.measureText(character).width;
      const advance = measure.measureText(line.slice(0, index)).width + spacing * index;
      const arcX = advance + charWidth / 2 - widths[row] / 2;
      const theta = arcX / radius;
      const x = radius * Math.sin(theta);
      const y = (row - .5) * size * 1.13;
      // Concave sphere: central glyphs recede, both sides approach the viewer.
      const z = radius - Math.sqrt(Math.max(1, radius * radius - x * x - y * y)) - width * .17;
      const angleY = -theta * 180 / Math.PI;
      const angleX = Math.asin(y / radius) * 180 / Math.PI;
      const glyph = document.createElement('span');
      glyph.className = `title-glyph ${row ? 'glyph-blue' : 'glyph-white'}`;
      if (character === '.') glyph.className = 'title-glyph glyph-white';
      glyph.style.width = `${charWidth}px`;
      glyph.style.height = `${size * 1.2}px`;
      glyph.style.transform = `translate3d(${x - charWidth / 2}px,${y - size * .6}px,${z}px) rotateY(${angleY}deg) rotateX(${angleX}deg)`;
      // Closely spaced planes form the letter's extrusion while retaining font contours.
      for (let layer = 36; layer >= 1; layer--) {
        const side = document.createElement('span');
        side.className = 'glyph-depth';
        const blue = row === 1 && character !== '.';
        const shade = (blue ? 43 : 65) - layer * (blue ? .62 : .85);
        side.style.color = `hsl(${blue ? 224 : 220} ${blue ? 72 : 20}% ${shade}%)`;
        side.style.webkitTextStroke = '.7px currentColor';
        side.textContent = character;
        side.style.transform = `translateZ(${-depth * layer / 36}px)`;
        glyph.append(side);
      }
      const face = document.createElement('span');
      face.className = 'glyph-face';
      face.textContent = character;
      glyph.append(face);
      stage.append(glyph);
    });
  });
  title.setAttribute('aria-label', lines.join(' '));
  title.classList.add('is-curved');
  title.replaceChildren(stage);
  applyTilt();
}
// Wait for the existing Barlow Condensed weight to avoid measuring fallback metrics.
document.fonts.load('800 100px "Barlow Condensed"').then(buildTitle).catch(buildTitle);
let resizeFrame;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(buildTitle);
});

// Pointer tilt is limited to a few degrees and eased with a frame-rate-independent spring.
const hero = document.querySelector('.hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('#motion');
let targetX = 0, targetY = 0, tiltX = 0, tiltY = 0;
let animation = 0, lastFrame = 0, inView = true;
const motionAllowed = () => !reduced.matches && motionButton?.getAttribute('aria-pressed') !== 'true';
function applyTilt() {
  const stage = title.querySelector('.title-sphere');
  if (!stage) return;
  stage.style.transform = `rotateX(${-8 + tiltX}deg) rotateY(${-5 + tiltY}deg)`;
  title.style.setProperty('--title-light-angle', `${125 + tiltY * 3}deg`);
}
function animateTilt(now) {
  animation = 0;
  if (!inView || document.hidden) { lastFrame = 0; return; }
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 1 / 60;
  lastFrame = now;
  const easing = 1 - Math.exp(-dt * 7);
  tiltX += (targetX - tiltX) * easing;
  tiltY += (targetY - tiltY) * easing;
  applyTilt();
  if (Math.abs(targetX - tiltX) + Math.abs(targetY - tiltY) > .008) animation = requestAnimationFrame(animateTilt);
  else lastFrame = 0;
}
function scheduleTilt() {
  if (!animation && inView && !document.hidden) animation = requestAnimationFrame(animateTilt);
}
function resetTilt() { targetX = targetY = 0; scheduleTilt(); }
hero.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch' || !motionAllowed()) return;
  const bounds = hero.getBoundingClientRect();
  targetY = ((event.clientX - bounds.left) / bounds.width - .5) * 14;
  targetX = -((event.clientY - bounds.top) / bounds.height - .5) * 10;
  scheduleTilt();
}, { passive: true });
hero.addEventListener('pointerleave', resetTilt);
reduced.addEventListener('change', () => { if (!motionAllowed()) { targetX = targetY = tiltX = tiltY = 0; cancelAnimationFrame(animation); animation = 0; applyTilt(); } });
motionButton?.addEventListener('click', () => { if (!motionAllowed()) resetTilt(); });
new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; if (inView) scheduleTilt(); else { cancelAnimationFrame(animation); animation = 0; lastFrame = 0; } }).observe(hero);
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(animation); animation = 0; lastFrame = 0; } else scheduleTilt(); });
