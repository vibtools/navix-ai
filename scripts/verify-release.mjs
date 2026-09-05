import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const releaseRoot = join(projectRoot, 'release');
const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(join(projectRoot, 'dist/manifest.json'), 'utf8'));
const artifactPath = join(releaseRoot, `navix-ai-v${packageJson.version}.zip`);
const bytes = await readFile(artifactPath);

function readUInt16(offset) { return bytes.readUInt16LE(offset); }
function readUInt32(offset) { return bytes.readUInt32LE(offset); }

function findEndOfCentralDirectory() {
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (readUInt32(offset) === 0x06054b50) return offset;
  }
  throw new Error('ZIP end-of-central-directory record is missing.');
}

function readZipEntries() {
  const end = findEndOfCentralDirectory();
  const count = readUInt16(end + 10);
  const centralOffset = readUInt32(end + 16);
  const entries = new Map();
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    assert.equal(readUInt32(cursor), 0x02014b50, 'Invalid ZIP central-directory entry.');
    const method = readUInt16(cursor + 10);
    const compressedSize = readUInt32(cursor + 20);
    const uncompressedSize = readUInt32(cursor + 24);
    const nameLength = readUInt16(cursor + 28);
    const extraLength = readUInt16(cursor + 30);
    const commentLength = readUInt16(cursor + 32);
    const localOffset = readUInt32(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    assert(!entries.has(name), `Duplicate ZIP entry: ${name}`);
    assert.equal(readUInt32(localOffset), 0x04034b50, `Invalid local header for ${name}.`);
    const localNameLength = readUInt16(localOffset + 26);
    const localExtraLength = readUInt16(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const content = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    assert.ok(content, `Unsupported compression method for ${name}.`);
    assert.equal(content.length, uncompressedSize, `Unexpected uncompressed size for ${name}.`);
    entries.set(name, content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const entries = readZipEntries();
const requiredEntries = ['index.html', 'manifest.json', 'src/background.js', 'src/content.js', 'src/sidepanel.js'];
for (const name of requiredEntries) assert.ok(entries.has(name), `Release artifact is missing ${name}.`);
for (const name of entries.keys()) {
  assert.doesNotMatch(name, /(?:^|\/)(?:server\.cjs|package\.json|package-lock\.json|\.env)(?:\.map)?$/, `Server/config file leaked into ${name}.`);
  assert.doesNotMatch(name, /\.map$/, `Source map leaked into ${name}.`);
}

const packagedManifest = JSON.parse(entries.get('manifest.json').toString('utf8'));
assert.equal(packagedManifest.name, 'Navix AI');
assert.equal(packagedManifest.version, manifest.version);
assert.equal(packagedManifest.version_name, `v${packageJson.version}`);
assert.equal(packagedManifest.content_scripts, undefined);
assert.ok(!packagedManifest.permissions.includes('tabs'));
assert.ok(!packagedManifest.host_permissions.includes('<all_urls>'));

const digest = createHash('sha256').update(bytes).digest('hex');
const sums = await readFile(join(releaseRoot, 'SHA256SUMS'), 'utf8');
assert.match(sums, new RegExp(`^${digest}\\s+navix-ai-v${packageJson.version}\\.zip$`, 'm'));

console.log(`Release artifact verified: ${packageJson.version} (${entries.size} files, SHA-256 ${digest}).`);
