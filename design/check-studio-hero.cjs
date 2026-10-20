const assert = require('node:assert/strict');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const {chromium} = require(require.resolve('playwright', {paths: [process.env.PLAYWRIGHT_MODULE_PATH || 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const root = path.resolve(__dirname, '..');
const artifacts = process.env.ARTIFACT_DIR;
if (artifacts) fs.mkdirSync(artifacts, {recursive: true});
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + req.url.split('?')[0]);
  if (req.url.split('?')[0].endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.webp':'image/webp', '.png':'image/png', '.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(8773, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    for (const width of [1440, 1024, 768, 390, 320]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      const errors = [], failedAssets = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400 && /hero-studio|motion-bundle|experience\.css/.test(response.url())) failedAssets.push(response.url()); });
      await page.goto(process.env.SITE_URL || 'http://127.0.0.1:8773/');
      await page.waitForFunction(() => document.documentElement.dataset.motionEngine === 'framer-motion');
      await page.waitForFunction(() => [...document.querySelectorAll('.has-portrait img')].every(img => img.complete && img.naturalWidth > 0));
      await page.waitForTimeout(1900);
      assert.equal(await page.locator('h1').count(), 1);
      assert.match(await page.locator('h1').innerText(), /Ансамбль танца\s+«Ликование»\s+студия с душой/);
      assert.equal(await page.locator('.stage-banner .ribbon-canvas').count(), 0, 'portrait should not be covered by the former sculpture');
      const bounds = await page.evaluate(() => {
        const heading = document.querySelector('h1').getBoundingClientRect();
        const button = document.querySelector('.studio-enrol').getBoundingClientRect();
        const portrait = document.querySelector('.studio-portrait img').getBoundingClientRect();
        return {overflow: document.documentElement.scrollWidth > innerWidth, headingLeft: heading.left, headingRight: heading.right, buttonLeft: button.left, buttonRight: button.right, buttonBottom: button.bottom, portraitHeight: portrait.height};
      });
      assert.equal(bounds.overflow, false, JSON.stringify(bounds));
      assert.ok(bounds.headingLeft >= 12 && bounds.headingRight <= width - 12, JSON.stringify(bounds));
      assert.ok(bounds.buttonLeft >= 12 && bounds.buttonRight <= width - 12, JSON.stringify(bounds));
      assert.ok(bounds.buttonBottom < 900, 'trial booking should be reachable on the initial viewport');
      assert.ok(bounds.portraitHeight > 170);
      if (artifacts) await page.screenshot({path: path.join(artifacts, `studio-hero-${width}.png`), fullPage: false});
      if (artifacts && width === 1440) await page.locator('.stage-banner').screenshot({path: path.join(artifacts, 'studio-main-banner.png')});
      await page.locator('.studio-enrol').click();
      await page.waitForFunction(() => location.hash === '#enrol');
      await page.locator('#enrol').scrollIntoViewIfNeeded();
      assert.ok(await page.locator('#enrol input[type="tel"]').first().isVisible());
      assert.deepEqual(errors, []);
      assert.deepEqual(failedAssets, []);
      console.log(`Studio hero passed at ${width}px: images, readable layout, booking and stage engine`);
      await page.close();
    }
    const plain = await browser.newPage({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
    await plain.goto(process.env.SITE_URL || 'http://127.0.0.1:8773/');
    assert.ok(await plain.locator('.studio-portrait img').isVisible());
    assert.equal(await plain.locator('.studio-enrol').getAttribute('href'), '#enrol');
    await plain.close();
    console.log('Studio hero remains available without JavaScript');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => {console.error(error); process.exitCode = 1;});
