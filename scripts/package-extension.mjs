import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const distRoot = join(projectRoot, 'dist');
const releaseRoot = join(projectRoot, 'release');

const encoder = new globalThis.TextEncoder();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime() {
  return { date: 0x0021, time: 0 };
}

function writeUInt16(value) {
  const buffer = Buffer.allocUnsafe(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function writeUInt32(value) {
  const buffer = Buffer.allocUnsafe(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function createZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const { date, time } = dosDateTime();

  for (const file of files) {
    const name = encoder.encode(file.name);
    const source = file.content;
    const compressed = deflateRawSync(source, { level: 9 });
    const method = compressed.length < source.length ? 8 : 0;
    const data = method === 8 ? compressed : source;
    const checksum = crc32(source);
    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50), writeUInt16(20), writeUInt16(0x800), writeUInt16(method),
      writeUInt16(time), writeUInt16(date), writeUInt32(checksum), writeUInt32(data.length),
      writeUInt32(source.length), writeUInt16(name.length), writeUInt16(0), Buffer.from(name), data
    ]);
    locals.push(localHeader);

    const centralHeader = Buffer.concat([
      writeUInt32(0x02014b50), writeUInt16(20), writeUInt16(20), writeUInt16(0x800), writeUInt16(method),
      writeUInt16(time), writeUInt16(date), writeUInt32(checksum), writeUInt32(data.length),
      writeUInt32(source.length), writeUInt16(name.length), writeUInt16(0), writeUInt16(0), writeUInt16(0),
      writeUInt16(0), writeUInt32(0), writeUInt32(offset), Buffer.from(name)
    ]);
    centrals.push(centralHeader);
    offset += localHeader.length;
  }

  const centralDirectory = Buffer.concat(centrals);
  const endOfCentralDirectory = Buffer.concat([
    writeUInt32(0x06054b50), writeUInt16(0), writeUInt16(0), writeUInt16(files.length),
    writeUInt16(files.length), writeUInt32(centralDirectory.length), writeUInt32(offset), writeUInt16(0)
  ]);
  return Buffer.concat([...locals, centralDirectory, endOfCentralDirectory]);
}

async function collectFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolutePath, root));
    else if (entry.isFile()) files.push({ name: relative(root, absolutePath).split('\\').join('/'), content: await readFile(absolutePath) });
  }
  return files;
}

const manifest = JSON.parse(await readFile(join(distRoot, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
const version = packageJson.version;
if (!/^\d+(?:\.\d+){4}$/.test(version)) throw new Error(`Product version must have five numeric components: ${version}`);
if (manifest.version_name !== `v${version}`) throw new Error('Manifest version_name must match package.json version.');

const files = (await collectFiles(distRoot)).filter(({ name }) => !/^server\.cjs(?:\.map)?$/.test(name) && !name.endsWith('.map'));
if (!files.some(({ name }) => name === 'manifest.json')) throw new Error('Built extension manifest is missing.');
if (files.some(({ name }) => name.includes('server.cjs'))) throw new Error('Server output must not enter the extension artifact.');
if (files.some(({ name }) => name.startsWith('..') || name.includes('\\'))) throw new Error('Artifact contains an unsafe path.');

await mkdir(releaseRoot, { recursive: true });
const artifactPath = join(releaseRoot, `navix-ai-v${version}.zip`);
const artifact = createZip(files);
await writeFile(artifactPath, artifact);
const digest = createHash('sha256').update(artifact).digest('hex');
await writeFile(join(releaseRoot, 'SHA256SUMS'), `${digest}  ${artifactPath.split('/').pop()}\n`);
await writeFile(join(releaseRoot, 'release-manifest.json'), `${JSON.stringify({
  productVersion: version,
  chromeVersion: manifest.version,
  artifact: artifactPath.split('/').pop(),
  sha256: digest,
  fileCount: files.length,
  generatedFrom: 'dist excluding server-only output and source maps'
}, null, 2)}\n`);

const artifactStats = await stat(artifactPath);
console.log(`Packaged ${files.length} extension files into ${artifactPath} (${artifactStats.size} bytes).`);
console.log(`SHA-256: ${digest}`);
