import { animate, stagger, inView, scroll } from 'framer-motion/dom';
import { createRibbonScene } from './ribbon-scene.js';
import { createStageEffects } from './stage-effects.js';

const media = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 700px)');
const ribbonScene = createRibbonScene(document.querySelector('.stage-banner:not(.has-portrait)'));
const stageEffects = createStageEffects();
const ease = [0.22, 1, 0.36, 1];
const controls = new Set();
const disposers = [];
const ambientControls = new Set();
let ambientPaused = false;
let manualMotion = true;
function reduced() { return media.matches && !manualMotion; }
function play(target, frames, options) {
  const control = animate(target, frames, options);
  controls.add(control);
  control.then(() => controls.delete(control));
  return control;
}
function reset() {
  ribbonScene.setMotion(false);
  stageEffects.setMotion(false);
  clearTimeout(autoTimer);
  sceneRequest++;
  automaticRequest = 0;
  requestedScene = activeScene;
  sceneButtons.forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.scene) === activeScene)));
  transitionImage?.remove();
  transitionImage = null;
  disposers.splice(0).forEach(stop => stop());
  controls.forEach(control => control.stop());
  controls.clear();
  ambientControls.clear();
  document.querySelectorAll('[data-motion]').forEach(el => {
    el.getAnimations().forEach(animation => animation.cancel());
    el.style.opacity = '1'; el.style.transform = 'none';
  });
}
function tag(selector) {
  const elements = [...document.querySelectorAll(selector)];
  elements.forEach(el => el.dataset.motion = 'true');
  return elements;
}
const entrance = tag('.hero-copy .location, .hero-copy h1, .hero-copy .intro, .hero-copy .actions, .hero-copy .trial');
const photo = tag('.hero-photo img')[0];
const stageSection = document.querySelector('.hero');
const photoCaption = document.querySelector('.hero-photo figcaption');
photoCaption.dataset.motion = 'true';
const curtains = ['left', 'right'].map(side => {
  const curtain = document.createElement('div');
  curtain.className = `stage-curtain stage-curtain-${side}`;
  curtain.setAttribute('aria-hidden', 'true');
  stageSection.querySelector('.hero-photo').append(curtain);
  return curtain;
});
const prefix = location.pathname.includes('/design/') ? '../' : '';
const photoWebp = document.querySelector('.hero-photo source[type="image/webp"]');
const scenes = [
  {src: '041.jpg', alt: 'Артисты ансамбля «Ликование» на сцене на фоне логотипа школы', label: 'Сцена'},
  {src: '002.jpg', alt: 'Ученицы занимаются у хореографического станка', label: 'Занятия'},
  {src: '091.jpg', alt: 'Ансамбль на сцене', label: 'Ансамбль'}
];
const sceneButtons = scenes.map((scene, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.scene = String(index);
  button.setAttribute('aria-pressed', String(index === 0));
  button.textContent = `${String(index + 1).padStart(2, '0')} / ${scene.label}`;
  return button;
});
const scenePicker = document.createElement('div');
scenePicker.className = 'hero-scene-picker';
scenePicker.setAttribute('role', 'group');
scenePicker.setAttribute('aria-label', 'Выберите сцену на главном экране');
sceneButtons.forEach(button => scenePicker.append(button));
stageSection.append(scenePicker);
let activeScene = 0;
let requestedScene = 0;
let sceneRequest = 0;
let sceneTransition;
let transitionImage;
let autoTimer;
let automaticRequest = 0;
let autoPaused = false;
let sceneVisible = false;
let sceneEngaged = false;
const autoplayToggle = document.createElement('button');
autoplayToggle.type = 'button';
autoplayToggle.className = 'scene-autoplay-toggle';
autoplayToggle.setAttribute('aria-pressed', 'false');
stageSection.append(autoplayToggle);
function autoplayEligible() {
  return !autoPaused && !reduced() && !ambientPaused && !document.hidden && sceneVisible && !sceneEngaged;
}
function syncAutoplay() {
  clearTimeout(autoTimer);
  if (!autoplayEligible() && automaticRequest) {
    sceneRequest++;
    automaticRequest = 0;
    requestedScene = activeScene;
    sceneTransition?.stop();
    transitionImage?.remove();
    transitionImage = null;
    photoCaption.style.opacity = '1';
    sceneButtons.forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.scene) === activeScene)));
  }
  autoplayToggle.disabled = reduced();
  autoplayToggle.textContent = reduced() ? 'Автосмена выключена' : autoPaused ? 'Включить автосмену' : 'Пауза слайдов';
  if (autoplayEligible()) {
    autoTimer = setTimeout(async () => {
      await showScene((activeScene + 1) % scenes.length, true);
      syncAutoplay();
    }, 6000);
  }
}
autoplayToggle.addEventListener('click', () => {
  autoPaused = !autoPaused;
  autoplayToggle.setAttribute('aria-pressed', String(autoPaused));
  syncAutoplay();
});
new IntersectionObserver(entries => {
  sceneVisible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.4;
  syncAutoplay();
}, {threshold: [0, 0.4]}).observe(stageSection);
scenePicker.addEventListener('pointerenter', event => {if (event.pointerType !== 'touch') {sceneEngaged = true; syncAutoplay();}});
scenePicker.addEventListener('pointerleave', () => {sceneEngaged = scenePicker.contains(document.activeElement); syncAutoplay();});
scenePicker.addEventListener('focusin', () => {sceneEngaged = true; syncAutoplay();});
scenePicker.addEventListener('focusout', event => {sceneEngaged = scenePicker.contains(event.relatedTarget); syncAutoplay();});
async function showScene(index, automatic = false) {
  if (index === requestedScene) return;
  requestedScene = index;
  const request = ++sceneRequest;
  automaticRequest = automatic ? request : 0;
  sceneTransition?.stop();
  transitionImage?.remove();
  transitionImage = null;
  const jpegSrc = `${prefix}research/assets/${scenes[index].src}`;
  const next = new Image();
  next.src = jpegSrc.replace(/\.jpg$/, '.webp');
  try {await next.decode();} catch {
    next.src = jpegSrc;
    try {await next.decode();} catch {if (request === sceneRequest) requestedScene = activeScene; return;}
  }
  if (request !== sceneRequest) return;
  sceneButtons.forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.scene) === index)));
  if (!reduced()) {
    next.className = 'scene-transition-image';
    next.alt = '';
    next.setAttribute('aria-hidden', 'true');
    transitionImage = next;
    photo.parentElement.append(next);
    sceneTransition = play(next, {opacity: [0, 1], scale: [1.02, 1]}, {duration: 1.1, ease});
    const captionOut = play(photoCaption, {opacity: [1, 0], y: [0, -5]}, {duration: 0.16, ease});
    await Promise.all([sceneTransition, captionOut]);
  }
  if (request !== sceneRequest) return;
  activeScene = index;
  automaticRequest = 0;
    photoWebp.srcset = jpegSrc.replace(/\.jpg$/, '.webp');
    photo.src = jpegSrc;
  photo.alt = scenes[index].alt;
  photoCaption.textContent = scenes[index].label;
  transitionImage?.remove();
  transitionImage = null;
  if (!reduced()) sceneTransition = play(photoCaption, {opacity: [0, 1], y: [5, 0]}, {duration: 0.32, ease});
  else {photo.style.opacity = '1'; photo.style.transform = 'none'; photoCaption.style.opacity = '1'; photoCaption.style.transform = 'none';}
}
sceneButtons.forEach(button => button.addEventListener('click', async () => {
  clearTimeout(autoTimer);
  await showScene(Number(button.dataset.scene));
  syncAutoplay();
}));
const awards = tag('.award-list article');
const detail = tag('.program-detail > div')[0];
const stageLights = [...document.querySelectorAll('.hero, .school, .contacts')].map(section => {
  const light = document.createElement('div');
  light.className = 'stage-light';
  light.setAttribute('aria-hidden','true');
  light.innerHTML = '<span class="stage-beam stage-beam-gold"></span><span class="stage-beam stage-beam-rose"></span><span class="stage-orbit"></span>';
  section.prepend(light);
  return light;
});
const beams = tag('.stage-beam, .stage-orbit');
const marquee = tag('.stage-marquee-track')[0];
const parallaxPhoto = tag('.hero-photo')[0];
const revealGroups = [...document.querySelectorAll('.section-head, .direction-grid, .teacher-grid, .review-grid, .schedule-grid, .video-grid, .achievement-layout, .offer-grid, .enrol-grid')];
revealGroups.forEach(group => [...group.children].forEach(el => el.dataset.motion = 'true'));
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
progressBar.setAttribute('aria-hidden', 'true');
document.body.append(progressBar);
const toggle = document.createElement('button');
toggle.className = 'motion-toggle';
toggle.type = 'button';
toggle.setAttribute('aria-pressed', 'false');
toggle.textContent = reduced() ? 'Включить эффекты' : 'Остановить фон';
document.querySelector('.hero').append(toggle);
function startAmbience() {
  if (reduced() || ambientPaused || document.hidden) return;
  syncAutoplay();
  ribbonScene.setMotion(true);
  stageEffects.setMotion(true);
  beams.forEach((beam, index) => {
    const direction = index % 2 ? -1 : 1;
    const control = play(beam, {
      x: [0, direction * (narrow.matches ? 35 : 110), 0],
      y: [0, index % 3 ? -35 : 45, 0],
      rotate: [-8 * direction, 12 * direction, -8 * direction],
      scale: [1, 1.14, 1]
    }, {duration: 12 + index % 3 * 4, repeat: Infinity, ease: 'easeInOut'});
    ambientControls.add(control);
  });
  if (marquee) {
    const [sequence, copy] = marquee.children;
    while (sequence.getBoundingClientRect().width < innerWidth) {
      sequence.innerHTML += sequence.innerHTML;
    }
    copy.innerHTML = sequence.innerHTML;
    const control = play(marquee, {x: [0, -sequence.getBoundingClientRect().width]}, {
      duration: 30, repeat: Infinity, ease: 'linear'
    });
    ambientControls.add(control);
  }
}
function stopAmbience() {
  clearTimeout(autoTimer);
  syncAutoplay();
  ribbonScene.setMotion(false);
  stageEffects.setMotion(false);
  ambientControls.forEach(control => { control.stop(); controls.delete(control); });
  ambientControls.clear();
}
toggle.addEventListener('click', () => {
  if (reduced()) {
    manualMotion = true;
    ambientPaused = false;
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'Остановить фон';
    reset(); start();
    return;
  }
  ambientPaused = !ambientPaused;
  toggle.setAttribute('aria-pressed', String(ambientPaused));
  toggle.textContent = ambientPaused ? 'Включить фон' : 'Остановить фон';
  stopAmbience();
  startAmbience();
});
document.addEventListener('visibilitychange', () => {
  stopAmbience();
  startAmbience();
});
function start() {
  document.documentElement.dataset.motionPreference = manualMotion ? 'manual' : reduced() ? 'off' : 'on';
  ribbonScene.setMotion(!reduced() && !ambientPaused && !document.hidden);
  stageEffects.setMotion(!reduced() && !ambientPaused && !document.hidden);
  syncAutoplay();
  if (reduced()) return;
  startAmbience();
  play(entrance, { opacity: [0, 1], y: [48, 0] }, { duration: 0.85, delay: stagger(0.12), ease });
  // Keep the curtain closed until the scene itself enters the viewport.
  let revealCancelled = false;
  const revealPhoto = () => {
    if (revealCancelled || reduced()) return;
    play(photo, { opacity: [0.35, 1], scale: [1.04, 1] }, { duration: 1.5, ease }).then(() => {
      if (revealCancelled || reduced()) return;
      play(curtains[0], {x: ['0%', '-100%']}, {duration: 2.2, ease});
      play(curtains[1], {x: ['0%', '100%']}, {duration: 2.2, ease});
    });
  };
  disposers.push(() => { revealCancelled = true; photo.removeEventListener('load', revealPhoto); });
  disposers.push(inView(stageSection, () => {
    if (photo.complete && photo.naturalWidth) revealPhoto();
    else photo.addEventListener('load', revealPhoto, {once: true});
  }, {amount: 0.2}));
  revealGroups.forEach(group => {
    const children = [...group.children];
    disposers.push(inView(children, element => {
      play(element, {opacity: [0.15, 1], y: [48, 0]}, {
        duration: 0.8, delay: (children.indexOf(element) % (narrow.matches ? 2 : 3)) * 0.08, ease
      });
    }, {amount: 'some', margin: '0px 0px -60px 0px'}));
  });
  disposers.push(inView('.award-list', () => {
    play(awards, { opacity: [0.35, 1], x: [12, 0] }, { duration: 0.45, delay: stagger(0.09), ease });
  }, { amount: 0.25 }));
  disposers.push(scroll(progress => {
    progressBar.style.transform = `scaleX(${progress})`;
  }));
  const headerHeight = Math.round(document.querySelector('header').getBoundingClientRect().height);
  disposers.push(scroll(progress => {
    parallaxPhoto.style.transform = `translateY(${progress * (narrow.matches ? 0 : 120)}px)`;
    stageLights[0].style.transform = `translateY(${progress * -70}px)`;
  }, {target: stageSection, offset: [`start ${headerHeight}px`, `end ${headerHeight}px`]}));
}
media.addEventListener('change', () => {
  toggle.textContent = reduced() ? 'Включить эффекты' : ambientPaused ? 'Включить фон' : 'Остановить фон';
  reset();
  const active = document.querySelector('[data-age][aria-pressed="true"]');
  if (active) updateProgram(Number(active.dataset.age));
  start();
});
narrow.addEventListener('change', () => { reset(); start(); });
start();

const programs = [
 ['Для самых маленьких','Движение начинается с игры','Ритмопластика и артикуляционная гимнастика. Знакомство с движением, ритмом и танцем в игровой форме.'],
 ['Для дошкольников','Почувствовать ритм','Развитие координации, ритма и гибкости. Первые танцевальные навыки в комплексной программе школы.'],
 ['Для детей 6–7 лет','Основа для большого пути','Основы классического, народного и современного танца. Знакомство с техникой и выразительностью.'],
 ['Для школьников и подростков','Танец выходит на сцену','Занятия хореографией, репертуар и концертные группы. Условия участия в выступлениях и конкурсах уточняются у педагогов.'],
 ['Для взрослых','Танцевать для себя','Боди-балет и танцы народов мира. Подходящую программу и действующее расписание поможет выбрать школа.']
];
document.getElementById('program-title').setAttribute('aria-live','polite');
let selection = 0;
let transition;
function updateProgram(index) {
  const [age,title,text] = programs[index];
  document.getElementById('program-age').textContent = age;
  document.getElementById('program-title').textContent = title;
  document.getElementById('program-text').textContent = text;
}
document.querySelectorAll('[data-age]').forEach(button => button.addEventListener('click', async () => {
  if (button.getAttribute('aria-pressed') === 'true') return;
  const current = ++selection;
  transition?.stop();
  document.querySelectorAll('[data-age]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  if (!reduced()) {
    transition = play(detail, { opacity: 0, y: -6 }, { duration: 0.12 });
    await transition;
  }
  if (current !== selection) return;
  updateProgram(Number(button.dataset.age));
  if (reduced()) { detail.style.opacity = '1'; detail.style.transform = 'none'; }
  else transition = play(detail, { opacity: [0, 1], y: [8, 0] }, { duration: 0.3, ease });
}));
document.querySelectorAll('.button, [data-age], .hero-scene-picker button').forEach(button => {
  button.dataset.motion = 'true';
  button.addEventListener('pointerdown', () => {
    if (!reduced()) play(button, { scale: 0.97 }, { duration: 0.1 });
  });
  const release = () => { if (!reduced()) play(button, { scale: 1 }, { type: 'spring', stiffness: 450, damping: 30 }); };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('pointercancel', release);
});
window.addEventListener('pagehide', reset);
window.addEventListener('pageshow', event => {
  if (event.persisted) { reset(); start(); }
});
document.documentElement.dataset.motionEngine = 'framer-motion';
document.querySelectorAll('[data-mail-form]').forEach(form => form.addEventListener('submit',event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const body = [...new FormData(form)].map(([name,value])=>`${name}: ${value}`).join('\n');
  const mail = `mailto:ans.likovanie@gmail.com?subject=${encodeURIComponent('Запись в школу танцев Ликование')}&body=${encodeURIComponent(body)}`;
  form.querySelector('[data-mail-status]').textContent = 'Письмо подготовлено. Отправьте его в почтовом приложении. Если приложение не открылось, позвоните +7 911 226 92 82.';
  window.location.href = mail;
}));
let pointerFrame = 0;
stageSection.addEventListener('pointermove', event => {
  if (narrow.matches || reduced() || pointerFrame) return;
  const bounds = stageSection.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width * 100;
  const y = (event.clientY - bounds.top) / bounds.height * 100;
  pointerFrame = requestAnimationFrame(() => {
    stageSection.style.setProperty('--stage-x', `${x}%`);
    stageSection.style.setProperty('--stage-y', `${y}%`);
    pointerFrame = 0;
  });
});
