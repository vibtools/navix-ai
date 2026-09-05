import test from 'node:test';
import assert from 'node:assert/strict';
import { createXlsx, parseCsv, parseStructuredFile, parseXlsx, serializeCsv } from '../src/capabilities/structuredData.js';
import { analyzeRows } from '../src/capabilities/dataAnalysis.js';
import { groupEmailRows } from '../src/capabilities/emailGrouper.js';
import { generateSyntheticIdentity } from '../src/capabilities/generators.js';
import { artifactExtension, extractArtifacts } from '../src/capabilities/artifacts.js';
import { validateUploadBatch } from '../src/core/filePolicy.js';
import { ErrorCode } from '../src/core/errorContract.js';

test('CSV quoted fields round-trip and JSON records become a table', async () => {
  const rows = [['name', 'note'], ['Ada', 'hello, "world"'], ['Lin', 'two\nlines']];
  assert.deepEqual(parseCsv(serializeCsv(rows)), rows);
  assert.deepEqual(await parseStructuredFile({ name: 'data.json', text: '[{"a":1,"b":"x"},{"a":2,"b":"y"}]' }), [['a', 'b'], [1, 'x'], [2, 'y']]);
});

test('locally generated XLSX is a real readable workbook', async () => {
  const rows = [['Name', 'Score', 'Active'], ['Ada', 9.5, true], ['Lin', 8, false]];
  const workbook = createXlsx(rows);
  assert.equal(new DataView(workbook.buffer, workbook.byteOffset, workbook.byteLength).getUint32(0, true), 0x04034b50);
  assert.deepEqual(await parseXlsx(workbook), rows);
});

test('analysis, email grouping, generators and artifacts produce concrete outputs', () => {
  const rows = [['from', 'subject', 'score'], ['a@example.com', 'One', 10], ['a@example.com', 'Two', 20]];
  assert.equal(analyzeRows(rows).columns[2].mean, 15);
  assert.equal(groupEmailRows(rows)[0].count, 2);
  const identity = generateSyntheticIdentity(() => 0);
  assert.equal(identity.synthetic, true);
  assert.ok(identity.firstName && identity.address);
  assert.deepEqual(extractArtifacts('```javascript\nconst x = 1;\n```'), [{ id: 'artifact_0', language: 'javascript', content: 'const x = 1;' }]);
  assert.equal(artifactExtension('javascript'), 'js');
});

test('upload policy rejects unsupported files and oversized inputs', () => {
  assert.throws(() => validateUploadBatch([{ name: 'run.exe', size: 1 }]), (error) => error.code === ErrorCode.FILE_TYPE_UNSUPPORTED);
  assert.throws(() => validateUploadBatch([{ name: 'large.pdf', size: 9 * 1024 * 1024 }]), (error) => error.code === ErrorCode.FILE_TOO_LARGE);
});
