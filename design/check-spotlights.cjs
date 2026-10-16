const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(require.resolve('playwright', {
  paths: [process.env.PLAYWRIGHT_MODULE_PATH || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules']
}));

(async () => {
  const browser = await chromium.launch({headless: true,
    ...(fs.existsSync('/usr/bin/chromium') ? {executablePath: '/usr/bin/chromium', args: ['--no-sandbox']} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.SITE_URL || 'http://127.0.0.1:8000/');
    await page.waitForFunction(() => document.documentElement.dataset.motionEngine === 'framer-motion');
    const galleryToggle = page.locator('.gallery-toggle');
    if (await galleryToggle.count() && await galleryToggle.getAttribute('aria-expanded') === 'false') {
      await galleryToggle.click();
      await page.waitForFunction(() => !document.querySelector('.gallery-reveal').hasAttribute('aria-busy'));
    }
    assert.equal(await page.locator('#gallery .scroll-spotlight').count(), 4, 'Gallery has four distinct spotlight cones');
    assert.equal(await page.locator('#teachers .scroll-spotlight').count(), 4, 'Light sections also have spotlight cones');
    await page.evaluate(() => scrollTo({top: document.querySelector('#achievements').getBoundingClientRect().top + scrollY, behavior: 'instant'}));
    await page.waitForTimeout(1500);
    const lit = await page.screenshot({clip: {x: 0, y: 100, width: 1440, height: 250}});
    await page.locator('#achievements .scroll-lights').evaluate(el => {el.style.visibility = 'hidden';});
    const unlit = await page.screenshot({clip: {x: 0, y: 100, width: 1440, height: 250}});
    await page.locator('#achievements .scroll-lights').evaluate(el => {el.style.visibility = '';});
    const brightness = await page.evaluate(async ([lit, unlit]) => {
      async function pixels(src) {
        const img = new Image(); img.src = `data:image/png;base64,${src}`; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      }
      const [a,b] = await Promise.all([pixels(lit), pixels(unlit)]);
      let difference = 0;
      for (let i = 0; i < a.length; i += 4) difference += a[i] + a[i+1] + a[i+2] - b[i] - b[i+1] - b[i+2];
      return difference / (a.length / 4 * 3);
    }, [lit.toString('base64'), unlit.toString('base64')]);
    assert.ok(brightness > .15, `Spotlights visibly brighten the dark awards background (mean RGB change ${brightness})`);
    const angles = () => page.locator('#gallery .scroll-spotlight').evaluateAll(elements => elements.map(el => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return Math.atan2(m.b, m.a) * 180 / Math.PI;
    }));
    const positions = await page.locator('#gallery').evaluate(el => {
      const top = el.getBoundingClientRect().top + scrollY;
      return [top + 100, top + Math.min(1000, el.offsetHeight * .3)];
    });
    await page.evaluate(top => scrollTo({top, behavior: 'instant'}), positions[0]);
    await page.waitForTimeout(1100);
    const start = await angles();
    await page.evaluate(top => scrollTo({top, behavior: 'instant'}), positions[1]);
    await page.waitForTimeout(1100);
    const forward = await angles();
    assert.ok(forward[0] < start[0] - 1 && forward[2] > start[2] + 1, 'Opposite sources turn towards one another during scrolling');
    await page.evaluate(top => scrollTo({top, behavior: 'instant'}), positions[0]);
    await page.waitForTimeout(1100);
    const reverse = await angles();
    assert.ok(reverse[0] > forward[0] + 1 && reverse[2] < forward[2] - 1, 'Reversing scroll reverses the beams');
    const rig = await page.locator('#gallery .scroll-light-rig').boundingBox();
    assert.ok(rig.y <= 1 && rig.y + rig.height > 500, 'Lighting remains on screen through a tall gallery');
    const link = page.locator('#gallery .gallery-grid a').nth(6);
    await link.scrollIntoViewIfNeeded();
    const box = await link.boundingBox();
    assert.ok(await page.evaluate(({x,y}) => !!document.elementFromPoint(x,y)?.closest('#gallery .gallery-grid a'),
      {x: box.x + box.width / 2, y: Math.max(140, box.y + box.height / 2)}), 'Photographs remain above the light and clickable');
    await page.locator('.motion-toggle').click();
    await page.evaluate(top => scrollTo({top, behavior: 'instant'}), positions[0]);
    const paused = await angles();
    await page.evaluate(top => scrollTo({top, behavior: 'instant'}), positions[1]);
    await page.waitForTimeout(300);
    assert.deepEqual(await angles(), paused, 'Global pause freezes spotlight positions even while scrolling');
    await page.locator('.motion-toggle').click();
    await page.evaluate(top => scrollTo({top, behavior: 'instant'}), positions[0]);
    await page.waitForTimeout(1100);
    await page.emulateMedia({reducedMotion: 'reduce'});
    const reduced = await angles();
    await page.evaluate(top => scrollTo({top, behavior: 'instant'}), positions[1]);
    await page.waitForTimeout(300);
    assert.notDeepEqual(await angles(), reduced, 'Effects stay enabled when the system requests reduced motion');
    for (const width of [700,390,320]) {
      await page.setViewportSize({width,height:844});
      assert.equal(await page.locator('#gallery .scroll-spotlight').evaluateAll(els => els.filter(el => getComputedStyle(el).display !== 'none').length), 2, 'Mobile uses only two visible cones');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px`);
    }
    assert.deepEqual(errors, []);
    console.log('Passed: visible spotlight cones, opposite scroll/reverse movement, sticky gallery light, photo clicks, global pause, reduced motion, mobile layout');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
