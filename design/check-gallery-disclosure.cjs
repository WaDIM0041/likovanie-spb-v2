const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.PLAYWRIGHT_MODULE_PATH||'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const root=path.resolve(__dirname,'..');
const artifacts=process.env.ARTIFACT_DIR;
if(artifacts)fs.mkdirSync(artifacts,{recursive:true});
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+req.url.split('?')[0]);if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{await new Promise(r=>server.listen(8770,'127.0.0.1',r));const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});try{
  for(const width of [1440,390,320]){
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.SITE_URL||'http://127.0.0.1:8770/');
    const toggle=page.locator('.gallery-toggle'),items=page.locator('#gallery .gallery-grid > a'),viewport=page.locator('.gallery-reveal');
    await toggle.waitFor();assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await items.count(),49);assert.equal(await page.locator('#gallery .gallery-grid > a:not([hidden])').count(),4);
    await page.locator('#gallery').scrollIntoViewIfNeeded();
    await items.first().click();await page.waitForFunction(()=>document.querySelector('#gallery-lightbox').open);await page.locator('[data-gallery-next]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#gallery-lightbox').evaluate(e=>e.open),false);
    if(artifacts){await page.locator('#gallery').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifacts,`gallery-folded-${width}.png`)});}
    const closed=(await viewport.boundingBox()).height;await toggle.click();await page.waitForTimeout(150);
    const middle=await viewport.evaluate(e=>({height:e.getBoundingClientRect().height,target:e.firstElementChild.getBoundingClientRect().height,animated:!!e.getAnimations().length}));
    assert.ok(middle.animated&&middle.height>closed&&middle.height<middle.target,'Block height grows through intermediate values');
    assert.ok(await items.nth(4).evaluate(e=>e.getAnimations().length>0),'New pictures have a separate settling animation');
    await page.waitForFunction(()=>!document.querySelector('.gallery-reveal').hasAttribute('aria-busy'));
    assert.equal(await page.locator('#gallery .gallery-grid > a:not([hidden])').count(),49);assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await viewport.evaluate(e=>e.style.height),'');
    if(artifacts){await page.locator('#gallery').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(artifacts,`gallery-open-${width}.png`)});}
    await items.nth(5).click();await page.waitForFunction(()=>document.querySelector('#gallery-lightbox').open);await page.keyboard.press('Escape');
    await toggle.click();await page.waitForFunction(()=>!document.querySelector('.gallery-reveal').hasAttribute('aria-busy'));assert.equal(await page.locator('#gallery .gallery-grid > a:not([hidden])').count(),4);
    await toggle.click();await toggle.click();await page.waitForFunction(()=>!document.querySelector('.gallery-reveal').hasAttribute('aria-busy'));assert.equal(await toggle.getAttribute('aria-expanded'),'false','Rapid toggle keeps the final requested state');
    await page.emulateMedia({reducedMotion:'reduce'});await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await viewport.getAttribute('aria-busy'),null);await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile overflow');assert.deepEqual(errors,[]);console.log('Gallery passed: four previews, smooth expansion, photo scatter, lightbox, collapse, reduced motion at '+width+'px');await page.close();
  }
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exit(1)});
