import * as THREE from 'three';
const canvas=document.querySelector('#contact-flame');
const container=canvas.parentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motion=document.querySelector('#motion');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
renderer.setClearColor(0,0);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
varying vec2 vUv;uniform float time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(7.1,3.2);a*=.5;}return v;}
void main(){
 vec2 p=vec2((vUv.x-.5)*2.,vUv.y);
 float t=time*1.7;
 float y=clamp((p.y-.13)/.79,0.,1.);
 vec2 flow=vec2(p.x*4.8,p.y*6.-t);
 float n=fbm(flow+vec2(sin(y*7.-t)*.65,0.));
 float curl=fbm(vec2(p.x*8.+n*3.,p.y*9.-t*1.6));
 float bend=sin(y*8.-t*1.3)*.09*y+(n-.5)*.3*y;
 float width=.38*pow(1.-y,.7)*smoothstep(.07,.24,p.y);
 float field=width-abs(p.x+bend)+(n-.48)*.28+(curl-.5)*.13;
 float bottom=smoothstep(.09,.16,p.y);
 float top=1.-smoothstep(.88,.98,p.y);
 float mask=smoothstep(.0,.012,field)*bottom*top;
 float middle=smoothstep(.075,.087,field+(curl-.5)*.10);
 float inner=smoothstep(.155,.167,field+(n-.5)*.10-y*.035);
 float white=smoothstep(.225,.237,field-y*.08);
 // Moving dark gaps and detached tongues make the flame tear and curl.
 float holes=smoothstep(.64,.69,curl)*smoothstep(.27,.55,p.y);
 mask*=1.-holes;
 vec3 color=mix(vec3(.015,.25,.07),vec3(.035,.68,.19),middle);
 color=mix(color,vec3(.36,1.,.4),inner);
 color=mix(color,vec3(.9,1.,.72),white);
 float halo=exp(-pow(p.x*3.,2.)-pow((p.y-.42)*2.7,2.))*.09;
 float alpha=mask+halo;
 for(int i=0;i<8;i++){
  float id=float(i),life=fract(time*(.48+id*.015)+id*.163);
  vec2 q=vec2(sin(id*13.)*(.18+life*.12)+sin(life*8.+id)*.06,.22+life*.68);
  vec2 d=(p-q)/vec2(.014+.014*(1.-life),.027);
  float spark=(1.-smoothstep(.65,1.,length(d)))*sin(life*3.14159);
  color=mix(color,vec3(.31,.95,.33),spark);alpha+=spark;
 }
 gl_FragColor=vec4(color,clamp(alpha,0.,1.));
 #include <colorspace_fragment>
}`});
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
let frame=0,last=0,visible=false;
const enabled=()=>!reduced.matches&&motion.getAttribute('aria-pressed')!=='true';
function draw(){renderer.render(scene,camera);}
function tick(now){frame=0;if(!visible||document.hidden)return;if(last)material.uniforms.time.value+=Math.min((now-last)/1000,.05);last=now;draw();if(enabled())frame=requestAnimationFrame(tick);}
function update(){cancelAnimationFrame(frame);frame=0;last=0;if(visible&&!document.hidden&&enabled())frame=requestAnimationFrame(tick);else draw();}
new ResizeObserver(()=>{renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(container.clientWidth,container.clientHeight,false);draw();}).observe(container);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();}).observe(container);
motion.addEventListener('click',update);reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update);
