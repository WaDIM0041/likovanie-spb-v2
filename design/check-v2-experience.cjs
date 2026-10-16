const assert = require('node:assert/strict');
const { chromium } = require(require.resolve('playwright', { paths: ['/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await assert.equal(await page.evaluate(() => document.documentElement.dataset.motionEngine), 'framer-motion', 'existing stage animation must remain active');

    const menu = page.locator('.menu-toggle');
    await assert.equal(await menu.isVisible(), true, 'mobile menu control must be visible');
    await menu.click();
    await assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'mobile menu should open');
    await page.locator('#main-navigation a[href="#contacts"]').click();
    await assert.equal(await menu.getAttribute('aria-expanded'), 'false', 'navigation should close after selection');

    const quickActions = page.locator('.mobile-quick-actions a');
    await assert.equal(await quickActions.count(), 3, 'three quick contact actions must be available');
    await assert.equal(await quickActions.nth(0).getAttribute('href'), 'tel:+79112269282');
    assert.match(await quickActions.nth(1).getAttribute('href'), /^https:\/\/wa\.me\/79112269282\?text=/);
    await assert.equal(await quickActions.nth(2).getAttribute('href'), '#enrol');

    await page.locator('#gallery a[data-gallery-item]').first().click();
    const dialog = page.locator('#gallery-lightbox');
    await assert.equal(await dialog.evaluate(el => el.open), true, 'gallery should open in a site lightbox');
    await page.waitForFunction(() => document.querySelector('#gallery-lightbox img:not([aria-hidden])').naturalWidth > 0);
    await assert.ok(await dialog.locator('img:not([aria-hidden])').getAttribute('src'), 'lightbox should show a selected image');
    await dialog.locator('[data-gallery-next]').click();
    await assert.equal(await dialog.evaluate(el => el.open), true, 'gallery should remain open while browsing');
    await dialog.locator('[data-gallery-close]').click();
    await assert.equal(await dialog.evaluate(el => el.open), false, 'gallery close control should close lightbox');

    await page.locator('[data-schedule-filter="adults"]').click();
    const visibleAdults = await page.locator('#schedule [data-schedule-group="adults"]:not([hidden])').count();
    const visibleChildren = await page.locator('#schedule [data-schedule-group="children"]:not([hidden])').count();
    assert.ok(visibleAdults > 0, 'adult schedule should stay visible when its filter is selected');
    assert.equal(visibleChildren, 0, 'children schedule should be hidden when adult filter is selected');
    console.log('v2 experience: mobile menu, quick actions, gallery and schedule filter passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
