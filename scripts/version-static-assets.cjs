// Update cache keys without rebuilding the already verified motion bundles.
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const files = ['design/style.css', 'design/stage.css', 'design/experience.css', 'design/motion-bundle.js', 'design/ribbon-webgl-bundle.js', 'design/v2-experience.js'];
const hash = createHash('sha256');
files.forEach(file => hash.update(fs.readFileSync(file)));
const version = hash.digest('hex').slice(0, 12);
let html = fs.readFileSync('index.html', 'utf8');
files.forEach(file => {
  const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  html = html.replace(new RegExp(`${escaped}(?:\\?v=[\\w-]+)?`, 'g'), `${file}?v=${version}`);
});
fs.writeFileSync('index.html', html);
console.log(`Static asset version: ${version}`);
