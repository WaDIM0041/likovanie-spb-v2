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
  }

  const dialog = document.querySelector('#gallery-lightbox');
  const galleryItems = [...document.querySelectorAll('#gallery a[data-gallery-item]')];
  if (dialog && galleryItems.length) {
    const image = dialog.querySelector('img');
    const caption = dialog.querySelector('[data-gallery-caption]');
    let activeIndex = 0;
    const show = index => {
      activeIndex = (index + galleryItems.length) % galleryItems.length;
      const item = galleryItems[activeIndex];
      image.src = item.querySelector('source')?.srcset || item.href;
      image.alt = item.querySelector('img')?.alt || '';
      caption.textContent = `${activeIndex + 1} / ${galleryItems.length}`;
    };
    galleryItems.forEach((item, index) => item.addEventListener('click', event => {
      event.preventDefault(); show(index); dialog.showModal();
    }));
    dialog.querySelector('[data-gallery-next]').addEventListener('click', () => show(activeIndex + 1));
    dialog.querySelector('[data-gallery-prev]').addEventListener('click', () => show(activeIndex - 1));
    dialog.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
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
})();
