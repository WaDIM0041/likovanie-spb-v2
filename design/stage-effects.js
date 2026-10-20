import {scroll} from 'framer-motion/dom';
import {createScrollSpotlights} from './scroll-spotlights.js';

export function createStageEffects() {
  const spotlights = createScrollSpotlights();
  const layers=[];
  for(const selector of ['.stage-banner','#teachers','#gallery']) {
    const section=document.querySelector(selector);
    if(!section || section.classList.contains('has-portrait'))continue;
    section.classList.add('depth-section');
    const decor=document.createElement('div');decor.className='depth-decor';decor.setAttribute('aria-hidden','true');
    decor.innerHTML='<span class="depth-layer depth-halo"></span><span class="depth-layer depth-line"></span>';
    section.prepend(decor);layers.push({section,elements:[...decor.children]});
  }
  let active=false,stops=[];
  const frame=document.querySelector('.living-frame');
  const video=frame?.querySelector('video');
  const toggle=frame?.querySelector('.living-toggle');
  let visible=false,localPaused=false,request=0;
  function syncVideo() {
    if(!video)return;
    const play=active&&visible&&!localPaused&&!document.hidden;
    const attempt=++request;
    if(play) {
      if(!video.src)video.src=video.dataset.src;
      video.play().then(()=>{if(attempt!==request&&(!active||!visible||localPaused||document.hidden))video.pause();}).catch(()=>{
        if(attempt===request){localPaused=true;toggle.textContent='Включить движение';toggle.setAttribute('aria-pressed','true');}
      });
    } else video.pause();
    toggle.textContent=localPaused?'Включить движение':'Пауза';
    toggle.disabled=!active;
    toggle.setAttribute('aria-pressed',String(localPaused));
  }
  if(frame) {
    toggle.hidden=false;
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncVideo();},{threshold:0}).observe(frame);
    toggle.addEventListener('click',()=>{localPaused=!localPaused;syncVideo();});
  }
  return {setMotion(enabled) {
    active=enabled;
    spotlights.setMotion(enabled);
    stops.splice(0).forEach(stop=>stop());
    layers.forEach(({section,elements})=>{
      elements.forEach(el=>{el.style.transform='none';});
      if(enabled)stops.push(scroll(progress=>{
        const distance=matchMedia('(max-width:700px)').matches?20:90;
        elements[0].style.transform=`translate3d(0,${(progress-.5)*distance}px,0) rotate(${progress*9}deg)`;
        elements[1].style.transform=`translate3d(${(progress-.5)*distance*.25}px,${(.5-progress)*distance*.5}px,0)`;
      },{target:section,offset:['start end','end start']}));
    });
    syncVideo();
  }};
}
