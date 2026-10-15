const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
for (const page of ['index.html', 'design/index.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const credit = html.match(/<a class="site-credit"[^>]*href="https:\/\/annakam\.ru\/"[^>]*>([\s\S]*?)<\/a>/);
  assert.ok(credit, `${page}: Anna Kamchatka credit link is missing`);
  assert.match(credit[1], /Создание сайта:/);
  assert.match(credit[1], />AK</);
  assert.doesNotMatch(credit[1], /ANNA KAMCHATKA/, 'credit must not contain the removed name');
  assert.match(credit[1], /annakam\.ru/);
}

const styles = fs.readFileSync(path.join(root, 'design/stage.css'), 'utf8');
assert.match(styles, /\.site-credit/, 'credit badge needs footer styling');
console.log('footer credit: AK link and badge styling are present without the removed name');
