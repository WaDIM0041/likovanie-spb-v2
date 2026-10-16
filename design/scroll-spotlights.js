import {scroll} from 'framer-motion/dom';

// The sources stay fixed; only their aim follows the section's scroll progress.
const sources = [
  {pivot: 12, start: -18, sweep: -60, color: 'gold'},
  {pivot: 27, start: 18, sweep: -84, color: 'turquoise'},
  {pivot: 88, start: 18, sweep: 60, color: 'pearl'},
  {pivot: 73, start: -18, sweep: 84, color: 'gold'}
];

export function createScrollSpotlights() {
  const scenes = [];
  let enabled = false;
  let raf = 0;
  let last = 0;
  let stops = [];

  for (const selector of ['#gallery', '#teachers', '#programs', '#achievements', '#school', '#contacts']) {
    const section = document.querySelector(selector);
    if (!section) continue;
    section.classList.add('scroll-light-section');
    const light = document.createElement('div');
    light.className = 'scroll-lights';
    light.setAttribute('aria-hidden', 'true');
    const rig = document.createElement('div');
    rig.className = 'scroll-light-rig';
    const cones = sources.map(source => {
      const cone = document.createElement('span');
      cone.className = `scroll-spotlight scroll-spotlight-${source.color}`;
      cone.style.left = `${source.pivot}%`;
      cone.style.transform = `translateX(-50%) rotate(${source.start}deg)`;
      rig.append(cone);
      return cone;
    });
    light.append(rig);
    section.prepend(light);
    scenes.push({section, cones, visible: false, target: 0, current: 0});
  }

  function wake() {
    if (enabled && !document.hidden && !raf && scenes.some(scene => scene.visible)) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    raf = 0;
    if (!enabled || document.hidden) return;
    const dt = last ? Math.min(50, now - last) : 16;
    last = now;
    const smoothing = 1 - Math.exp(-dt / 100);
    let moving = false;
    for (const scene of scenes) {
      if (!scene.visible) continue;
      const delta = scene.target - scene.current;
      if (Math.abs(delta) < .00015) scene.current = scene.target;
      else {scene.current += delta * smoothing; moving = true;}
      scene.cones.forEach((cone, index) => {
        const source = sources[index];
        const angle = source.start + source.sweep * scene.current;
        cone.style.transform = `translateX(-50%) rotate(${angle}deg)`;
      });
    }
    if (moving) raf = requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const scene = scenes.find(item => item.section === entry.target);
      scene.visible = entry.isIntersecting;
    }
    wake();
  }, {threshold: 0});
  scenes.forEach(scene => observer.observe(scene.section));

  return {setMotion(next) {
    if (enabled === next) return;
    enabled = next;
    stops.splice(0).forEach(stop => stop());
    cancelAnimationFrame(raf);
    raf = 0;
    if (!enabled) return;
    stops = scenes.map(scene => scroll(progress => {
      scene.target = Math.max(0, Math.min(1, progress));
      wake();
    }, {target: scene.section, offset: ['start end', 'end start']}));
    wake();
  }};
}
