import assert from 'node:assert/strict';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const requiredFiles = [
  'dist/index.html',
  'dist/manifest.json',
  'dist/src/background.js',
  'dist/src/content.js',
  'dist/src/sidepanel.js',
  'dist/server.cjs'
];

await Promise.all(requiredFiles.map((file) => access(file)));

async function collectJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectJavaScript(path));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
assert.equal(manifest.background.service_worker, 'src/background.js');
assert.equal(manifest.content_scripts, undefined, 'Page access must use activeTab or an optional origin grant.');
assert.ok(!manifest.permissions.includes('tabs'), 'Broad tabs permission must remain removed.');
assert.ok(!manifest.host_permissions.includes('<all_urls>'), 'Broad required host access must remain removed.');
assert.ok(manifest.host_permissions.includes('https://cdn.jsdelivr.net/*'), 'OCR language data host must be explicit.');
assert.deepEqual(manifest.optional_host_permissions, ['https://*/*', 'http://*/*']);

const javascriptFiles = await collectJavaScript('dist/src');
const javascript = await Promise.all(javascriptFiles.map((file) => readFile(file, 'utf8'))).then((files) => files.join('\n'));
assert.match(javascript, /assets\/worker\.min\.js/, 'OCR worker code must be packaged locally.');
assert.match(javascript, /assets\/tesseract-core-lstm\.wasm\.js/, 'OCR core code must be packaged locally.');
assert.match(javascript, /assets\/pdf\.worker\.min\.mjs/, 'PDF worker code must be packaged locally.');

const budgets = [
  ['dist/src/sidepanel.js', 600_000],
  ['dist/src/background.js', 450_000],
  ['dist/assets/sidepanel.css', 80_000],
  ['dist/src/MarkdownContent.js', 850_000],
  ['dist/src/pdf.min.js', 500_000],
  ['dist/assets/tesseract-core-lstm.wasm.js', 4_200_000]
];
for (const [file, limit] of budgets) {
  const size = (await stat(file)).size;
  assert.ok(size <= limit, `${file} exceeds the ${limit}-byte release budget (actual ${size}).`);
}

const contentScript = await readFile('dist/src/content.js', 'utf8');
assert.doesNotMatch(contentScript, /^\s*import\s/m, 'Content script must be self-contained.');
assert.doesNotMatch(contentScript, /^\s*export\s/m, 'Content script must not expose ES module syntax.');

console.log('Extension build structure verified.');
