import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const requiredFiles = [
  'dist/index.html',
  'dist/manifest.json',
  'dist/src/background.js',
  'dist/src/content.js',
  'dist/src/sidepanel.js',
  'dist/server.cjs'
];

await Promise.all(requiredFiles.map((file) => access(file)));

const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
assert.equal(manifest.background.service_worker, 'src/background.js');
assert.equal(manifest.content_scripts, undefined, 'Page access must use activeTab or an optional origin grant.');
assert.ok(!manifest.permissions.includes('tabs'), 'Broad tabs permission must remain removed.');
assert.ok(!manifest.host_permissions.includes('<all_urls>'), 'Broad required host access must remain removed.');
assert.ok(manifest.host_permissions.includes('https://cdn.jsdelivr.net/*'), 'OCR language data host must be explicit.');
assert.deepEqual(manifest.optional_host_permissions, ['https://*/*', 'http://*/*']);

const sidebar = await readFile('dist/src/sidepanel.js', 'utf8');
assert.match(sidebar, /assets\/worker\.min\.js/, 'OCR worker code must be packaged locally.');
assert.match(sidebar, /assets\/tesseract-core-lstm\.wasm\.js/, 'OCR core code must be packaged locally.');

const contentScript = await readFile('dist/src/content.js', 'utf8');
assert.doesNotMatch(contentScript, /^\s*import\s/m, 'Content script must be self-contained.');
assert.doesNotMatch(contentScript, /^\s*export\s/m, 'Content script must not expose ES module syntax.');

console.log('Extension build structure verified.');
