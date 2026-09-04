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
assert.equal(manifest.content_scripts[0].js[0], 'src/content.js');

const contentScript = await readFile('dist/src/content.js', 'utf8');
assert.doesNotMatch(contentScript, /^\s*import\s/m, 'Content script must be self-contained.');
assert.doesNotMatch(contentScript, /^\s*export\s/m, 'Content script must not expose ES module syntax.');

console.log('Extension build structure verified.');

