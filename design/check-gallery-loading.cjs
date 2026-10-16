const assert = require('node:assert/strict');
const {chromium} = require(require.resolve('playwright', {paths: ['/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules']}));

(async () => {
  const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    await page.addInitScript(() => {
      const decode = HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode = function () {
        const ready = decode.call(this);
        return /\/019\.webp$/.test(this.src) ? ready.then(() => new Promise(resolve => {
          window.waitingForGallery = true;
          window.releaseGallery = resolve;
        })) : ready;
      };
    });
    await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4175/', {waitUntil: 'networkidle'});
    await page.locator('#gallery .gallery-grid a').first().click();
    await page.waitForFunction(() => document.querySelector('#gallery-lightbox img').naturalWidth > 0);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.waitingForGallery);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('#gallery-lightbox img:not([aria-hidden])').src.endsWith('075.webp'));
    await page.evaluate(() => window.releaseGallery());
    await page.waitForTimeout(250);
    assert.match(await page.locator('#gallery-lightbox img:not([aria-hidden])').getAttribute('src'), /075\.webp$/, 'a delayed earlier photo must not replace the latest choice');
    const position = await page.evaluate(() => -parseFloat(document.body.style.top));
    await page.keyboard.press('Escape');
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - position) < 2, 'gallery restores the original page position');
    await page.close();

    const failed = await browser.newPage({viewport: {width: 390, height: 844}});
    await failed.route('**/research/assets/019.{jpg,webp}', route => route.abort());
    await failed.goto(process.env.SITE_URL || 'http://127.0.0.1:4175/', {waitUntil: 'networkidle'});
    await failed.locator('#gallery .gallery-grid a').first().click();
    await failed.waitForFunction(() => document.querySelector('#gallery-lightbox img').naturalWidth > 0);
    await failed.keyboard.press('ArrowRight');
    await failed.waitForFunction(() => document.querySelector('.gallery-status').textContent.includes('не загрузилось'));
    assert.match(await failed.locator('#gallery-lightbox img:not([aria-hidden])').getAttribute('src'), /041\.webp$/, 'a failed image keeps the previous photo visible');
    await failed.keyboard.press('ArrowLeft');
    await failed.waitForFunction(() => document.querySelector('#gallery-lightbox img:not([aria-hidden])').src.endsWith('026.webp'));
    assert.equal(await failed.locator('.gallery-status').textContent(), '', 'gallery recovers after another photo is selected');
    await failed.keyboard.press('Escape');
    console.log('Gallery loading: latest selection wins, failed image recovery and scroll restoration passed');
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
