import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const tag = process.env.GITHUB_REF_NAME || '';
assert.equal(tag, `v${packageJson.version}`, `Git tag ${tag || '(missing)'} must match v${packageJson.version}.`);
console.log(`Release tag verified: ${tag}.`);
