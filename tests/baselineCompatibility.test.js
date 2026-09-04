import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Phase 01 preserves extension identity, permissions and version', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'Navix AI');
  assert.equal(manifest.version, '1.0.0.1');
  assert.equal(manifest.version_name, 'v1.0.0.1.2');
  assert.equal(packageJson.version, '1.0.0.1.2');
  assert.deepEqual(manifest.permissions, ['sidePanel', 'tabs', 'activeTab', 'scripting', 'storage']);
});

test('legacy storage database and key prefix remain compatible', async () => {
  const source = await readFile(new URL('../src/core/appStorage.js', import.meta.url), 'utf8');
  assert.match(source, /AICopilotDB/);
  assert.match(source, /copilot_/);
});

test('extension artifact workflow remains hard-paused through Phase 04', async () => {
  const workflow = await readFile(new URL('../.github/workflows/build-extension.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /if: \$\{\{ false \}\}/);
  assert.doesNotMatch(workflow, /\bpush:/);
  assert.match(workflow, /npm ci/);
});

test('background conversation state is request-local', async () => {
  const source = await readFile(new URL('../src/background/serviceWorker.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\blet\s+chatHistory\s*=\s*\[\]/);
  assert.match(source, /runProviderRequest\(\{ \.\.\.request, screenshotDataUrl \}/);
  assert.doesNotMatch(source, /api\.openai\.com|api-inference\.huggingface\.co|generateContentStream/);
});
