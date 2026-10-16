// Interaction treatments adapted from https://artbalkon.annakam.ru/.
(() => {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('.hero-scene-picker button, .scene-autoplay-toggle, .motion-toggle, .living-toggle, .gallery-nav, .gallery-close, .menu-toggle, #contacts .button')
    .forEach(element => element.classList.add('ref-button'));

  const pending = new Map();
  let frame = 0;
  function followPointer(event) {
    if (!finePointer.matches || event.pointerType === 'touch') return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    pending.set(element, {x: Math.round(event.clientX - rect.left), y: Math.round(event.clientY - rect.top)});
    if (!frame) frame = requestAnimationFrame(() => {
      for (const [card, point] of pending) {
        card.style.setProperty('--ref-x', `${point.x}px`);
        card.style.setProperty('--ref-y', `${point.y}px`);
      }
      pending.clear(); frame = 0;
    });
  }
  document.querySelectorAll('.direction-grid article, .teacher-grid article, .review-grid article, .price-grid article, .offer-grid article, .schedule-grid article, .award-list article')
    .forEach(card => {
      card.classList.add('ref-card');
      for (const type of ['spot', 'border']) {
        const light = document.createElement('span');
        light.className = `reference-card-${type}`;
        light.setAttribute('aria-hidden', 'true');
        card.append(light);
      }
      card.addEventListener('pointerenter', followPointer);
      card.addEventListener('pointermove', followPointer, {passive: true});
    });

  document.querySelectorAll('.hero-photo, .achievement-layout figure, .program-detail figure > picture, .teacher-grid article > picture, #gallery .gallery-grid a')
    .forEach(photo => {
      photo.classList.add('ref-photo');
      if (photo.tagName !== 'PICTURE') {
        const sheen = document.createElement('span');
        sheen.className = 'reference-photo-sheen';
        sheen.setAttribute('aria-hidden', 'true');
        photo.append(sheen);
      }
    });
  addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; pending.clear(); });
})();
