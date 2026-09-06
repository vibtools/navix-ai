import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('heavy UI and capability engines are loaded on demand', async () => {
  const sidebar = await source('src/components/Sidebar.jsx');
  assert.match(sidebar, /lazy\(\(\) => import\('\.\/MarkdownContent\.jsx'\)\)/);
  assert.match(sidebar, /lazy\(\(\) => import\('\.\/CapabilityDrawer\.jsx'\)\)/);
  assert.match(sidebar, /import\('\.\.\/capabilities\/pdfExtraction\.js'\)/);
  assert.match(sidebar, /import\('\.\.\/capabilities\/ocrExtraction\.js'\)/);
  assert.doesNotMatch(sidebar, /^import ReactMarkdown from/m);
  assert.doesNotMatch(sidebar, /^import .*react-syntax-highlighter/m);
  assert.doesNotMatch(sidebar, /^import .*pdfjs-dist/m);
  assert.doesNotMatch(sidebar, /^import .*tesseract\.js/m);
});

test('PDF and OCR workers are local, bounded, and cleaned up', async () => {
  const pdf = await source('src/capabilities/pdfExtraction.js');
  const ocr = await source('src/capabilities/ocrExtraction.js');
  assert.match(pdf, /pdf\.worker\.min\.mjs\?url/);
  assert.match(pdf, /maxTextCharacters/);
  assert.match(pdf, /page\.cleanup/);
  assert.match(pdf, /pdf\.destroy/);
  assert.match(ocr, /worker\.min\.js\?url/);
  assert.match(ocr, /tesseract-core-lstm\.wasm\.js\?url/);
  assert.match(ocr, /OCR_TIMEOUT_MS = 45_000/);
  assert.match(ocr, /worker\.terminate/);
  assert.match(ocr, /workerBlobURL: false/);
});

test('release tooling and documentation are present', async () => {
  const packageJson = JSON.parse(await source('package.json'));
  assert.equal(packageJson.license, 'MIT');
  for (const path of [
    'LICENSE',
    'PRIVACY.md',
    'RELEASE_NOTES.md',
    'scripts/package-extension.mjs',
    'scripts/verify-release.mjs',
    'scripts/smoke-server.mjs',
    'scripts/verify-tag.mjs',
    'docs/PHASE04_QA_MATRIX.md'
  ]) await access(new URL(`../${path}`, import.meta.url));
});

test('release ZIP construction is byte-stable across Node/zlib versions', async () => {
  const packager = await source('scripts/package-extension.mjs');
  assert.doesNotMatch(packager, /deflateRawSync/);
  assert.match(packager, /const method = 0/);
  assert.match(packager, /return \{ date: 0x0021, time: 0 \}/);
});

test('repository hygiene excludes proven debug and empty legacy assets', async () => {
  for (const path of [
    'test-idb.js',
    'test-local.js',
    'test_hf.js',
    'test_hf.cjs',
    'test_hf2.cjs',
    'test_newline.js',
    'tmp.log',
    'src/sidebar/ChatPanel.jsx',
    'public/icons/icon16.png',
    'public/icons/icon48.png',
    'public/icons/icon128.png'
  ]) {
    await assert.rejects(access(new URL(`../${path}`, import.meta.url)));
  }
});

test('release version policy is aligned across package and manifest', async () => {
  const packageJson = JSON.parse(await source('package.json'));
  const manifest = JSON.parse(await source('public/manifest.json'));
  assert.match(packageJson.version, /^\d+(?:\.\d+){4}$/);
  assert.equal(manifest.version_name, `v${packageJson.version}`);
  assert.match(manifest.version, /^\d+(?:\.\d+){3}$/);
  assert.deepEqual(manifest.permissions, ['sidePanel', 'activeTab', 'scripting', 'storage']);
  assert.deepEqual(manifest.optional_host_permissions, ['https://*/*', 'http://*/*']);
});
