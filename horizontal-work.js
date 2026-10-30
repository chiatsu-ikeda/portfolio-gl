const section = document.querySelector('#work');
const rail = section.querySelector('.works-grid');
const pin = document.createElement('div');
pin.className = 'work-pin';
while(section.firstChild) pin.append(section.firstChild);
section.append(pin);
section.classList.add('horizontal-work');
rail.tabIndex = 0;
rail.setAttribute('aria-label','制作実績。左右にスクロールできます');
let distance = 0, frame = 0, programmatic = false;
function start(){return section.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(pin).top);}
function render(){
  frame=0;
  const desired=Math.max(0,Math.min(distance,window.scrollY-start()));
  if(Math.abs(rail.scrollLeft-desired)>1){programmatic=true;rail.scrollLeft=desired;}
}
function measure(){
  rail.querySelectorAll('.project').forEach(card=>{
    const image=card.querySelector('.project-image img');
    const box=card.querySelector('.project-image');
    if(!image.naturalWidth)return;
    const style=getComputedStyle(box);
    const imageHeight=box.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-20;
    const width=imageHeight*image.naturalWidth/image.naturalHeight;
    card.style.setProperty('--image-width',`${width}px`);
  });
  distance=Math.max(0,rail.scrollWidth-rail.clientWidth);
  section.style.height=`${pin.offsetHeight+distance}px`;
  render();
}
window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(render);},{passive:true});
// Native horizontal scrolling, touch dragging and keyboard input update page progress too.
rail.addEventListener('scroll',()=>{
  if(programmatic){programmatic=false;return;}
  const top=start();
  if(window.scrollY>=top-2 && window.scrollY<=top+distance+2){
    window.scrollTo({top:top+rail.scrollLeft,behavior:'instant'});
  }
},{passive:true});
rail.addEventListener('wheel',e=>{
  if(Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;
  const next=Math.max(0,Math.min(distance,rail.scrollLeft+e.deltaX));
  if(next===rail.scrollLeft)return;
  e.preventDefault();
  rail.scrollLeft=next;
},{passive:false});
new ResizeObserver(measure).observe(pin);
window.addEventListener('resize',measure);
rail.querySelectorAll('img').forEach(image=>image.addEventListener('load',measure));
document.fonts.ready.then(measure);
measure();
