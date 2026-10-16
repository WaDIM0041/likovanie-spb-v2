const assert = require('node:assert/strict');
const {chromium} = require(require.resolve('playwright', {paths: ['/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules']}));

(async () => {
  const browser = await chromium.launch({headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4175/', {waitUntil: 'networkidle'});
    const socialLinks = page.locator('footer .footer-socials a');
    assert.equal(await socialLinks.count(), 4, 'footer contains school social links');
    const expected = {
      'ВКонтакте': 'https://vk.com/ans.likovanie',
      'Telegram': 'https://t.me/SvetlanaBalashkova',
      'WhatsApp': 'https://wa.me/79112269282',
      'Яндекс Карты': 'https://yandex.ru/maps/org/ansambl_tantsa_likovaniye/145867168293/'
    };
    for (const [label, href] of Object.entries(expected)) {
      assert.equal(await page.locator(`footer .footer-socials [aria-label="${label}"]`).getAttribute('href'), href, 'icons lead to school accounts');
    }
    const darkButton = page.locator('#contacts .button');
    await darkButton.hover(); await page.waitForTimeout(650);
    const buttonEffect = await darkButton.evaluate(el => ({color: getComputedStyle(el).color, fillY: new DOMMatrix(getComputedStyle(el, '::before').transform).m42, shadow: getComputedStyle(el).boxShadow}));
    assert.equal(buttonEffect.color, 'rgb(255, 255, 255)', 'dark buttons retain readable text');
    assert.ok(Math.abs(buttonEffect.fillY) < .1, 'button fill rises on hover');
    assert.notEqual(buttonEffect.shadow, 'none', 'dark buttons have a visible glow');
    const card = page.locator('#why .direction-grid article').first();
    await card.hover({position: {x: 40, y: 50}});
    const before = await card.evaluate(el => el.style.getPropertyValue('--ref-x'));
    await card.hover({position: {x: 110, y: 80}});
    await page.waitForFunction(() => document.querySelector('#why .direction-grid article').style.getPropertyValue('--ref-x') === '110px');
    assert.notEqual(await card.evaluate(el => el.style.getPropertyValue('--ref-x')), before, 'card highlight follows the pointer');
    const link = page.locator('#gallery .gallery-grid a').first();
    await link.hover(); await page.waitForTimeout(1500);
    const effect = await link.locator('img').evaluate(el => ({scale: getComputedStyle(el).scale, duration: getComputedStyle(el).transitionDuration}));
    assert.ok(Number(effect.scale) > 1.04 && Number(effect.scale) <= 1.065, 'photo zoom is restrained');
    assert.ok(effect.duration.split(',').some(s => parseFloat(s) >= 1.4), 'photo zoom remains smooth');
    await link.click();
    await page.waitForFunction(() => document.querySelector('#gallery-lightbox img:not([aria-hidden])').naturalWidth > 0);
    assert.equal(await page.locator('.gallery-next').evaluate(el => getComputedStyle(el).position), 'absolute', 'gallery controls stay over the photograph');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#gallery-lightbox').evaluate(el => el.open), false, 'hover overlays do not block gallery clicks');
    for (const width of [320, 390]) {
      await page.setViewportSize({width, height: 844});
      await page.locator('footer .footer-socials').scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'footer icons fit narrow screens');
      assert.ok(await socialLinks.evaluateAll(links => links.every(link => link.getBoundingClientRect().width >= 44)), 'footer icons are comfortable touch targets');
      assert.ok(await page.locator('footer').evaluate(el => el.querySelector('.footer-socials').getBoundingClientRect().bottom <= el.querySelector('.footer-legal').getBoundingClientRect().top), 'social icons stay above legal links on mobile');
    }
    assert.deepEqual(errors, [], 'no browser errors');
    console.log('Reference effects: school links, cursor-following light, smooth photo zoom, gallery clicks and mobile footer passed');
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode = 1;});
