const assert = require('node:assert/strict');
const {chromium} = require(require.resolve('playwright', {paths: ['/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules']}));

(async () => {
  const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}, hasTouch: true});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4175/', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.documentElement.dataset.motionEngine === 'framer-motion');

    for (const width of [320, 390, 700]) {
      await page.setViewportSize({width, height: 844});
      const layout = await page.evaluate(() => {
        const rect = selector => document.querySelector(selector).getBoundingClientRect();
        const scene = rect('.hero'), photo = rect('.hero-photo'), picker = rect('.hero-scene-picker'), pause = rect('.motion-toggle');
        const menu = rect('.menu-toggle');
        const brand = document.querySelector('header .brand');
        const range = document.createRange(); range.selectNodeContents(brand);
        return {scene: scene.height, photo: photo.height, width: photo.width, pickerTop: picker.top, pickerBottom: picker.bottom,
          photoBottom: photo.bottom, pauseTop: pause.top, pauseBottom: pause.bottom, sceneBottom: scene.bottom,
          menuHeight: menu.height, brandRight: range.getBoundingClientRect().right, menuLeft: menu.left,
          overflow: document.documentElement.scrollWidth > innerWidth};
      });
      assert.ok(layout.scene - layout.photo <= 180, `scene controls leave no empty mobile region at ${width}px`);
      assert.ok(Math.abs(layout.photo / layout.width - 853 / 1280) < .02, 'scene preserves the full photograph aspect ratio');
      assert.ok(layout.pickerTop >= layout.photoBottom - 1, 'scene selection is below the photograph');
      assert.ok(layout.pauseTop >= layout.pickerBottom - 1, 'background pause does not overlap scene selection');
      assert.ok(layout.pauseBottom <= layout.sceneBottom + 1, 'pause remains inside its scene');
      assert.ok(layout.menuHeight >= 44 && layout.brandRight < layout.menuLeft, 'mobile menu is easy to tap and clear of the logo');
      assert.equal(layout.overflow, false, 'no horizontal overflow');
    }

    await page.setViewportSize({width: 390, height: 844});
    await page.locator('.menu-toggle').click(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false', 'Escape closes mobile navigation');

    await page.locator('[data-age="4"]').click();
    await page.locator('#choose-program').click();
    assert.equal(await page.locator('#form-0-2').inputValue(), '18+', 'chosen age reaches the trial form');
    assert.equal(await page.locator('#choose-program').getAttribute('href'), '#enrol', 'chosen group leads to enrolment');
    assert.equal(await page.locator('#form-1-0').isVisible(), false, 'the detailed form stays collapsed initially');
    await page.locator('.enrol-details > summary').click();
    assert.equal(await page.locator('#form-1-0').isVisible(), true, 'detailed enrolment remains available');

    const review = page.locator('.review-grid article').first();
    await review.locator('.review-toggle').click();
    assert.equal(await review.locator('.review-toggle').getAttribute('aria-expanded'), 'true', 'a full review can be read');

    const opener = page.locator('#gallery .gallery-grid a').first();
    await opener.click();
    const dialog = page.locator('#gallery-lightbox');
    await page.waitForFunction(() => document.querySelector('#gallery-lightbox img').naturalWidth > 0);
    const initial = await dialog.locator('img:not([aria-hidden])').getAttribute('src');
    const scrollBefore = await page.evaluate(() => scrollY);
    await page.mouse.move(100, 400); await page.mouse.wheel(0, 500); await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => scrollY), scrollBefore, 'background stays still behind the gallery');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(src => document.querySelector('#gallery-lightbox img:not([aria-hidden])').getAttribute('src') !== src, initial);
    await page.waitForFunction(() => document.querySelector('#gallery-lightbox').getAttribute('aria-busy') === 'false');
    const second = await dialog.locator('img:not([aria-hidden])').getAttribute('src');
    await dialog.locator('.gallery-stage').dispatchEvent('pointerdown', {pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 200});
    await dialog.locator('.gallery-stage').dispatchEvent('pointerup', {pointerId: 1, pointerType: 'touch', clientX: 80, clientY: 205});
    await page.waitForFunction(src => document.querySelector('#gallery-lightbox img:not([aria-hidden])').getAttribute('src') !== src, second);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.evaluate(el => el.open), false, 'Escape closes gallery');
    assert.equal(await opener.evaluate(el => el === document.activeElement), true, 'gallery returns focus to the opened photo');
    const restored = await page.evaluate(() => ({position: document.body.style.position, width: document.documentElement.scrollWidth}));
    assert.notEqual(restored.position, 'fixed', 'closing restores page scrolling');

    await page.setViewportSize({width: 1440, height: 900});
    const cards = await page.locator('.teacher-grid article').evaluateAll(elements => elements.map(el => {
      const photo = el.querySelector('picture').getBoundingClientRect();
      const title = el.querySelector('h3').getBoundingClientRect();
      const text = el.querySelector('p').getBoundingClientRect();
      return {photoRight: photo.right, textLeft: text.left, titleLeft: title.left, titleBottom: title.bottom, textTop: text.top};
    }));
    assert.ok(cards.every(card => card.textLeft >= card.photoRight && Math.abs(card.textLeft - card.titleLeft) < 1 && card.textTop >= card.titleBottom - 1), 'teacher title and biography share a column next to the portrait');
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('UX polish: mobile scene, header, teachers, gallery, enrolment and reviews passed');
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
