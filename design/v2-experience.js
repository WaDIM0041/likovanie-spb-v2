(() => {
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#main-navigation');
  if (menu && navigation) {
    const setMenu = open => {
      navigation.classList.toggle('is-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.textContent = open ? 'Закрыть' : 'Меню';
    };
    menu.addEventListener('click', () => setMenu(!navigation.classList.contains('is-open')));
    navigation.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && navigation.classList.contains('is-open')) { setMenu(false); menu.focus({preventScroll: true}); }
    });
    document.addEventListener('pointerdown', event => {
      if (!menu.contains(event.target) && !navigation.contains(event.target)) setMenu(false);
    });
    matchMedia('(max-width: 700px)').addEventListener('change', () => setMenu(false));
  }

  const scene = document.querySelector('.hero');
  if (scene) {
    const controls = document.createElement('div');
    controls.className = 'stage-controls';
    for (const selector of ['.hero-scene-picker', '.scene-autoplay-toggle', '.motion-toggle']) {
      const control = scene.querySelector(selector);
      if (control) controls.append(control);
    }
    scene.append(controls);
  }

  const gallerySection = document.querySelector('#gallery');
  const galleryGrid = gallerySection?.querySelector('.gallery-grid');
  if (galleryGrid && galleryGrid.children.length > 4) {
    const items = [...galleryGrid.children], previewCount = 4;
    const viewport = document.createElement('div');
    viewport.className = 'gallery-reveal'; viewport.id = 'gallery-photos';
    galleryGrid.before(viewport); viewport.append(galleryGrid);
    const tools = document.createElement('div'); tools.className = 'gallery-tools';
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'button gallery-toggle';
    toggle.setAttribute('aria-controls', viewport.id);
    const count = document.createElement('p'); count.className = 'gallery-count';
    count.setAttribute('role', 'status');
    tools.append(toggle, count); viewport.after(tools);
    let expanded = false, revision = 0, animations = [];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    function updateControls() {
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? 'Свернуть галерею' : 'Смотреть галерею';
      count.textContent = expanded ? `${items.length} фотографий` : `${previewCount} из ${items.length} фотографий`;
    }
    function settle() {
      animations.splice(0).forEach(animation => animation.cancel());
      viewport.style.height = ''; viewport.classList.remove('is-animating');
      viewport.removeAttribute('aria-busy');
    }
    function play(element, frames, options) {
      const animation = element.animate(frames, options); animations.push(animation);
      return animation.finished.catch(() => {});
    }
    async function setExpanded(next) {
      const current = ++revision;
      const fromHeight = viewport.getBoundingClientRect().height;
      const before = items.slice(0, previewCount).map(item => item.getBoundingClientRect());
      settle(); expanded = next; updateControls();
      viewport.style.height = `${fromHeight}px`;
      viewport.classList.add('is-animating'); viewport.setAttribute('aria-busy', 'true');
      gallerySection.classList.toggle('gallery-folded', !expanded);
      items.forEach((item, index) => { item.hidden = !expanded && index >= previewCount; });
      const toHeight = galleryGrid.getBoundingClientRect().height;
      if (reduced.matches) { settle(); return; }
      const duration = expanded ? 850 : 600;
      const pending = [play(viewport, [{height: `${fromHeight}px`}, {height: `${toHeight}px`}], {
        duration, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both'
      })];
      items.slice(0, previewCount).forEach((item, index) => {
        const after = item.getBoundingClientRect(), prior = before[index];
        if (!after.width || !after.height) return;
        pending.push(play(item, [
          {transform: `translate(${prior.left-after.left}px,${prior.top-after.top}px) scale(${prior.width/after.width},${prior.height/after.height})`},
          {transform: 'translate(0,0) scale(1)'}
        ], {duration, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both'}));
      });
      if (expanded) items.slice(previewCount).forEach((item, index) => {
        const drift = [-48, 34, -22, 52][index % 4], turn = [-9, 7, -5, 10][index % 4];
        pending.push(play(item, [
          {opacity: 0, transform: `translate(${drift}px,-85px) rotate(${turn}deg) scale(.84)`},
          {opacity: 1, transform: 'translate(0,0) rotate(0deg) scale(1)'}
        ], {duration: 780, delay: Math.min(index, 12) * 38, easing: 'cubic-bezier(.18,.8,.25,1)', fill: 'both'}));
      });
      await Promise.all(pending);
      if (current !== revision) return;
      settle();
      if (!expanded) {
        const top = gallerySection.getBoundingClientRect().top + scrollY;
        if (scrollY > top) scrollTo({top: Math.max(0, top - document.querySelector('header').offsetHeight - 20), behavior: 'smooth'});
        toggle.focus({preventScroll: true});
      }
    }
    gallerySection.classList.add('gallery-folded');
    items.slice(previewCount).forEach(item => { item.hidden = true; }); updateControls();
    toggle.addEventListener('click', () => setExpanded(!expanded));
    reduced.addEventListener('change', () => { ++revision; settle(); });
    addEventListener('pagehide', () => { ++revision; settle(); });
  }

  const dialog = document.querySelector('#gallery-lightbox');
  const galleryItems = [...document.querySelectorAll('#gallery a[data-gallery-item]')];
  if (dialog && galleryItems.length) {
    const image = dialog.querySelector('img');
    const caption = dialog.querySelector('[data-gallery-caption]');
    const stage = document.createElement('div'); stage.className = 'gallery-stage';
    image.before(stage); stage.append(image);
    const status = document.createElement('p'); status.className = 'gallery-status'; status.setAttribute('role', 'status');
    stage.after(status); caption.setAttribute('aria-live', 'polite');
    let requestedIndex = 0, displayedIndex = -1, request = 0, animation;
    let opener, pageY = 0, bodyStyles, swipe;
    const normalized = index => (index + galleryItems.length) % galleryItems.length;
    const source = index => galleryItems[index].querySelector('source')?.srcset || galleryItems[index].href;
    const prefetch = index => { const next = new Image(); next.src = source(normalized(index)); };
    async function show(index) {
      requestedIndex = normalized(index);
      const selected = requestedIndex, current = ++request;
      dialog.setAttribute('aria-busy', 'true'); status.textContent = 'Загружаем фотографию…';
      const next = new Image(); next.src = source(selected);
      try { await next.decode(); } catch {
        next.src = galleryItems[selected].href;
        try { await next.decode(); } catch {
          if (current === request && dialog.open) {
            status.textContent = 'Фото не загрузилось. Выберите другое или попробуйте ещё раз.';
            dialog.setAttribute('aria-busy', 'false'); requestedIndex = Math.max(displayedIndex, 0);
          }
          return;
        }
      }
      if (current !== request || !dialog.open) return;
      animation?.cancel(); stage.querySelectorAll('.gallery-outgoing').forEach(element => element.remove());
      let outgoing;
      if (image.getAttribute('src') && displayedIndex !== selected) {
        outgoing = image.cloneNode(); outgoing.className = 'gallery-outgoing'; outgoing.alt = '';
        outgoing.setAttribute('aria-hidden', 'true'); stage.prepend(outgoing);
      }
      image.src = next.src; image.alt = galleryItems[selected].querySelector('img')?.alt || '';
      displayedIndex = selected; caption.textContent = `${selected + 1} / ${galleryItems.length}`;
      status.textContent = ''; dialog.setAttribute('aria-busy', 'false');
      if (outgoing) {
        outgoing.animate({opacity: [1, 0]}, {duration: 600, easing: 'cubic-bezier(.22,1,.36,1)'});
        animation = image.animate({opacity: [0, 1]}, {duration: 600, easing: 'cubic-bezier(.22,1,.36,1)'});
        animation.finished.then(() => outgoing.remove()).catch(() => outgoing.remove());
      }
      prefetch(selected - 1); prefetch(selected + 1);
    }
    galleryItems.forEach((item, index) => item.addEventListener('click', event => {
      event.preventDefault(); opener = item; pageY = scrollY; bodyStyles = document.body.style.cssText;
      Object.assign(document.body.style, {position: 'fixed', top: `${-pageY}px`, left: '0', right: '0', width: '100%'});
      document.documentElement.classList.add('gallery-open'); image.removeAttribute('src'); image.alt = '';
      displayedIndex = -1; caption.textContent = ''; dialog.showModal(); show(index);
    }));
    dialog.querySelector('[data-gallery-next]').addEventListener('click', () => show(requestedIndex + 1));
    dialog.querySelector('[data-gallery-prev]').addEventListener('click', () => show(requestedIndex - 1));
    dialog.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); show(requestedIndex + (event.key === 'ArrowRight' ? 1 : -1)); }
    });
    stage.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') swipe = {x: event.clientX, y: event.clientY}; });
    stage.addEventListener('pointercancel', () => { swipe = null; });
    stage.addEventListener('pointerup', event => {
      if (!swipe) return;
      const x = event.clientX - swipe.x, y = event.clientY - swipe.y; swipe = null;
      if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y) * 1.3) show(requestedIndex + (x < 0 ? 1 : -1));
    });
    dialog.addEventListener('close', () => {
      ++request; animation?.cancel(); stage.querySelectorAll('.gallery-outgoing').forEach(element => element.remove());
      dialog.setAttribute('aria-busy', 'false'); document.body.style.cssText = bodyStyles;
      document.documentElement.classList.remove('gallery-open'); window.scrollTo({top: pageY, behavior: 'instant'});
      opener?.focus({preventScroll: true});
    });
  }

  const schedule = document.querySelector('#schedule');
  if (schedule) {
    const filters = [...schedule.querySelectorAll('[data-schedule-filter]')];
    const groups = [...schedule.querySelectorAll('[data-schedule-group]')];
    filters.forEach(filter => filter.addEventListener('click', () => {
      const selected = filter.dataset.scheduleFilter;
      filters.forEach(item => item.setAttribute('aria-pressed', String(item === filter)));
      groups.forEach(group => { group.hidden = selected !== 'all' && group.dataset.scheduleGroup !== selected; });
    }));
  }

  const trialAge = document.querySelector('#form-0-2');
  const selection = document.querySelector('#enrol-selection');
  const ages = ['2,5–3 года', '4–5 лет', '6–7 лет', '8–17 лет', '18+'];
  function chooseAge(index) {
    if (!trialAge) return;
    trialAge.value = ages[index]; trialAge.dispatchEvent(new Event('change', {bubbles: true}));
  }
  document.querySelectorAll('[data-age]').forEach(button => button.addEventListener('click', () => chooseAge(Number(button.dataset.age))));
  document.querySelector('#choose-program')?.addEventListener('click', () => {
    const selected = document.querySelector('[data-age][aria-pressed="true"]');
    if (selected) chooseAge(Number(selected.dataset.age));
  });
  trialAge?.addEventListener('change', () => {
    if (selection) selection.textContent = trialAge.value ? `Выбрана группа: ${trialAge.value}. Школа уточнит подходящее расписание.` : '';
  });

  document.querySelectorAll('.review-grid article').forEach((article, index) => {
    const quote = article.querySelector('blockquote');
    if (!quote || quote.textContent.trim().length < 260) return;
    quote.id = `review-${index + 1}`; article.classList.add('review-collapsible');
    const button = document.createElement('button'); button.type = 'button'; button.className = 'review-toggle';
    button.setAttribute('aria-controls', quote.id); button.setAttribute('aria-expanded', 'false'); button.textContent = 'Читать полностью';
    let animation;
    button.addEventListener('click', () => {
      animation?.cancel(); const before = quote.getBoundingClientRect().height;
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      article.classList.toggle('review-expanded', expanded); button.setAttribute('aria-expanded', String(expanded));
      button.textContent = expanded ? 'Свернуть отзыв' : 'Читать полностью';
      const after = quote.getBoundingClientRect().height;
      animation = quote.animate({height: [`${before}px`, `${after}px`]}, {duration: 450, easing: 'cubic-bezier(.22,1,.36,1)'});
    });
    article.append(button);
  });

  const banner = document.querySelector('.stage-banner');
  if (banner && scene) {
    for (const element of [banner, scene]) {
      const light = document.createElement('div'); light.className = 'light-transfer'; light.setAttribute('aria-hidden', 'true'); element.append(light);
    }
    let frame = 0;
    function updateLight() {
      frame = 0;
      if (document.hidden || scene.querySelector('.motion-toggle')?.getAttribute('aria-pressed') === 'true') return;
      const progress = Math.max(0, Math.min(1, (innerHeight - scene.getBoundingClientRect().top) / (innerHeight * .85)));
      const intensity = 4 * progress * (1 - progress);
      for (const element of [banner, scene]) {
        element.style.setProperty('--handoff-progress', progress.toFixed(3)); element.style.setProperty('--handoff-light', intensity.toFixed(3));
      }
    }
    const requestLight = () => { if (!frame) frame = requestAnimationFrame(updateLight); };
    addEventListener('scroll', requestLight, {passive: true}); addEventListener('resize', requestLight);
    document.addEventListener('visibilitychange', requestLight);
    scene.querySelector('.motion-toggle')?.addEventListener('click', requestLight); updateLight();
  }
})();
