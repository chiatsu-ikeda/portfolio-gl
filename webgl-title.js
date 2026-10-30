import * as THREE from 'three';
const canvas = document.querySelector('#title-canvas');
const container = document.querySelector('.hero-title-webgl');
const hero = document.querySelector('.hero');
const motion = document.querySelector('#motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const copies = ['IDEAS BEGIN WITH CURIOSITY.', 'SMALL DETAILS. BIG DIFFERENCE.', 'CREATIVE THINKING. CLEAR SOLUTIONS.', 'BRINGING EVERY PIXEL TO LIFE.', 'BUILT WITH CARE. MADE TO CONNECT.', 'THOUGHTFUL CODE. HUMAN EXPERIENCES.', 'TURNING POSSIBILITIES INTO REALITY.', 'DESIGNED TO MOVE YOU FORWARD.', 'ALWAYS EXPLORING. ALWAYS CREATING.', 'LET’S MAKE SOMETHING MEANINGFUL.'];
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,2);
camera.position.z = 1;
let renderer, material, texture, frame = 0, previous = 0, elapsed = 0, visible = true;
let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
const moving = () => !reduced.matches && motion.getAttribute('aria-pressed') !== 'true';
function makeTexture() {
  const surface = document.createElement('canvas');
  surface.width = 3072; surface.height = 1536;
  const ctx = surface.getContext('2d');
  ctx.clearRect(0,0,3072,1536);
  ctx.textBaseline = 'middle';
  const repeat = (text, y, font, color, offset=0) => {
    ctx.font = font; ctx.fillStyle = color;
    const width = ctx.measureText(text).width;
    for(let x=-width+offset; x<3072; x+=width) ctx.fillText(text,x,y);
  };
  // One dominant horizontal line, with tightly spaced, alternating small copy rows.
  ctx.font = '800 240px "PortfolioTitle"';
  const first = 'FROM DESIGN ', second = 'TO EXPERIENCE.';
  const measured=ctx.measureText(first+second).width;
  ctx.font=`800 ${Math.min(240,240*2700/measured)}px "PortfolioTitle"`;
  const firstWidth=ctx.measureText(first).width;
  const fullWidth=firstWidth+ctx.measureText(second).width;
  const origin=(3072-fullWidth)/2;
  const metrics=ctx.measureText(first+second);
  const baseline=768+(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;
  // One complete phrase per texture period; blank margins form a seamless word gap.
  ctx.fillStyle='#eae9e3';ctx.fillText(first,origin,baseline);
  ctx.fillStyle='#386bff';ctx.fillText(second,origin+firstWidth,baseline);
  // Deterministic variation keeps the composition stable across reloads.
  for(let i=0;i<12;i++) {
    for(const side of [-1,1]) {
      const y=768+side*(160+i*55);
      let x=-180+(i*137+(side+1)*91)%290;
      let phrase=0;
      while(x<3072) {
        const seed=i*7+phrase*3+(side+1)*5;
        const text=copies[(i+phrase+(side>0?5:0))%copies.length];
        const size=seed%3===0?31:34;
        ctx.font=seed%4===0?`700 ${size-4}px monospace`:`800 ${size}px "PortfolioTitle"`;
        ctx.fillStyle=['#7185ab','#386bff','#a4aec4','#7185ab'][seed%4];
        ctx.fillText(text,x,y);
        x+=ctx.measureText(text).width+45+(seed%5)*33;
        phrase++;
      }
    }
  }
  texture = new THREE.CanvasTexture(surface);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
}
function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(container.clientWidth,container.clientHeight,false);
  material.uniforms.aspect.value=container.clientWidth/container.clientHeight;
  const bounds=container.getBoundingClientRect();
  material.uniforms.centerY.value=1-(innerHeight/2-(bounds.top+scrollY))/bounds.height;
  const upper=document.querySelector('.hero-en').getBoundingClientRect();
  const lower=document.querySelector('.hero-caption').getBoundingClientRect();
  material.uniforms.safeBand.value.set(1-(lower.top-bounds.top-20)/bounds.height,1-(upper.bottom-bounds.top+20)/bounds.height);
  render();
}
function render() {
  if(!renderer || !material) return;
  material.uniforms.time.value=elapsed;
  material.uniforms.pointer.value.set(pointerX,pointerY);
  renderer.render(scene,camera);
  canvas.dataset.ready='true';
}
function tick(now) {
  frame=0;
  if(!visible || document.hidden) {previous=0;return;}
  const dt=previous?Math.min((now-previous)/1000,.05):0;
  previous=now;
  if(moving()) elapsed+=dt;
  pointerX+=(targetX-pointerX)*.065; pointerY+=(targetY-pointerY)*.065;
  render();
  if(moving() || Math.abs(targetX-pointerX)+Math.abs(targetY-pointerY)>.0001) schedule();
}
function schedule(){if(!frame && visible && !document.hidden) frame=requestAnimationFrame(tick);}
function stop(){cancelAnimationFrame(frame);frame=0;previous=0;}
async function init(){
  const font = new FontFace('PortfolioTitle','url(./assets/fonts/BarlowCondensed-ExtraBold.ttf)',{weight:'800'});
  document.fonts.add(await font.load());
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setClearColor(0,0);
  makeTexture();
  material=new THREE.ShaderMaterial({transparent:true,uniforms:{map:{value:texture},time:{value:0},aspect:{value:1},centerY:{value:.5},pointer:{value:new THREE.Vector2()},safeBand:{value:new THREE.Vector2(0,1)}},vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
    uniform sampler2D map; uniform float time; uniform float aspect; uniform float centerY; uniform vec2 pointer; uniform vec2 safeBand; varying vec2 vUv;
    void main(){
      vec2 p=vec2(vUv.x-.5,vUv.y-centerY);
      // Shallow continuous pinching of entire lines, matching the reference's text backdrop.
      float curve=.82+.30*pow(abs(p.x)*aspect,2.);
      // The source texture is 2:1. Match its pixel aspect instead of stretching it.
      float horizontalScale=aspect/2.;
      vec2 uv=vec2(p.x*horizontalScale,p.y/curve)+.5;
      uv.y-=p.x*aspect*.062;
      uv.y+=pointer.y*p.x*.025;
      uv.x+=pointer.x*.012;
      float row=floor((abs(uv.y-.5)*1536.-132.5)/55.);
      float isSub=step(.083,abs(uv.y-.5));
      uv.x+=mix(time*.0025,(mod(row,2.)*2.-1.)*time*.006,isSub);
      vec4 color=texture2D(map,uv);
      color.a*=smoothstep(0.,.04,uv.y)*smoothstep(0.,.04,1.-uv.y);
      color.a*=smoothstep(safeBand.x,safeBand.x+.045,vUv.y)*(1.-smoothstep(safeBand.y-.045,safeBand.y,vUv.y));
      gl_FragColor=color;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  container.classList.add('is-ready');resize();
  new ResizeObserver(resize).observe(container);
  window.addEventListener('resize',resize);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)schedule();else stop();}).observe(container);
  schedule();
}
hero.addEventListener('pointermove',e=>{if(!moving()||e.pointerType==='touch')return;const b=hero.getBoundingClientRect();targetX=(e.clientX-b.left)/b.width-.5;targetY=(e.clientY-b.top)/b.height-.5;schedule();},{passive:true});
hero.addEventListener('pointerleave',()=>{targetX=targetY=0;schedule();});
motion.addEventListener('click',()=>{previous=0;schedule();});
reduced.addEventListener('change',()=>{targetX=targetY=0;schedule();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule();});
init().catch(error=>{container.classList.remove('is-ready');console.error('WebGL title:',error);});
