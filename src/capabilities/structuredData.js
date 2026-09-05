import { AppError, ErrorCode } from '../core/errorContract.js';

function decodeEntities(value) {
  return String(value || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function escapeXml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function parseCsv(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const value = String(text || '').replace(/^\uFEFF/, '');
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quoted) {
      if (char === '"' && value[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === '') quoted = true;
    else if (char === delimiter) { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field || row.length || value.endsWith(delimiter)) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((item, index) => index === 0 || item.some((cell) => cell !== ''));
}

export function serializeCsv(rows, delimiter = ',') {
  return rows.map((row) => row.map((cell) => {
    const value = String(cell ?? '');
    return /["\r\n,]/.test(value) || value.includes(delimiter) ? `"${value.replace(/"/g, '""')}"` : value;
  }).join(delimiter)).join('\r\n');
}

function readUint16(data, offset) { return data[offset] | (data[offset + 1] << 8); }
function readUint32(data, offset) { return (readUint16(data, offset) | (readUint16(data, offset + 2) << 16)) >>> 0; }
function writeUint16(view, offset, value) { view.setUint16(offset, value, true); }
function writeUint32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let k = 0; k < 8; k += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(chunks) {
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}

function createStoredZip(files) {
  const encoder = new globalThis.TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = typeof content === 'string' ? encoder.encode(content) : content;
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50); writeUint16(localView, 4, 20); writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0); writeUint32(localView, 14, crc); writeUint32(localView, 18, data.length);
    writeUint32(localView, 22, data.length); writeUint16(localView, 26, nameBytes.length);
    local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length); locals.push(local);
    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50); writeUint16(centralView, 4, 20); writeUint16(centralView, 6, 20);
    writeUint32(centralView, 16, crc); writeUint32(centralView, 20, data.length); writeUint32(centralView, 24, data.length);
    writeUint16(centralView, 28, nameBytes.length); writeUint32(centralView, 42, offset); central.set(nameBytes, 46);
    centrals.push(central); offset += local.length;
  }
  const centralSize = centrals.reduce((total, chunk) => total + chunk.length, 0);
  const end = new Uint8Array(22); const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50); writeUint16(endView, 8, centrals.length); writeUint16(endView, 10, centrals.length);
  writeUint32(endView, 12, centralSize); writeUint32(endView, 16, offset);
  return concatBytes([...locals, ...centrals, end]);
}

function columnName(index) {
  let value = index + 1; let name = '';
  while (value) { value -= 1; name = String.fromCharCode(65 + (value % 26)) + name; value = Math.floor(value / 26); }
  return name;
}

export function createXlsx(rows, sheetName = 'Data') {
  const safeName = String(sheetName || 'Data').replace(/[\\/?*:[\]]/g, ' ').slice(0, 31) || 'Data';
  const sheetRows = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) => {
    const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
    if (typeof cell === 'number' && Number.isFinite(cell)) return `<c r="${ref}"><v>${cell}</v></c>`;
    if (typeof cell === 'boolean') return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(safeName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
  };
  return createStoredZip(files);
}

async function inflateRaw(bytes) {
  if (typeof globalThis.DecompressionStream !== 'function') {
    throw new AppError(ErrorCode.CAPABILITY_UNAVAILABLE, 'Compressed XLSX files are not supported in this browser.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new globalThis.DecompressionStream('deflate-raw'));
  return new Uint8Array(await new globalThis.Response(stream).arrayBuffer());
}

async function unzipEntries(input) {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  let end = data.length - 22;
  while (end >= Math.max(0, data.length - 65_557) && readUint32(data, end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new AppError(ErrorCode.FILE_TYPE_UNSUPPORTED, 'The XLSX ZIP directory is invalid.');
  const count = readUint16(data, end + 10);
  let cursor = readUint32(data, end + 16);
  const decoder = new globalThis.TextDecoder(); const entries = {};
  for (let index = 0; index < count; index += 1) {
    if (readUint32(data, cursor) !== 0x02014b50) throw new AppError(ErrorCode.FILE_TYPE_UNSUPPORTED, 'The XLSX entry directory is invalid.');
    const method = readUint16(data, cursor + 10);
    const compressedSize = readUint32(data, cursor + 20);
    const nameLength = readUint16(data, cursor + 28);
    const extraLength = readUint16(data, cursor + 30);
    const commentLength = readUint16(data, cursor + 32);
    const localOffset = readUint32(data, cursor + 42);
    const name = decoder.decode(data.slice(cursor + 46, cursor + 46 + nameLength));
    if (readUint32(data, localOffset) !== 0x04034b50) throw new AppError(ErrorCode.FILE_TYPE_UNSUPPORTED, 'The XLSX local entry is invalid.');
    const localNameLength = readUint16(data, localOffset + 26);
    const localExtraLength = readUint16(data, localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = data.slice(start, start + compressedSize);
    if (method === 0) entries[name] = compressed;
    else if (method === 8) entries[name] = await inflateRaw(compressed);
    else throw new AppError(ErrorCode.FILE_TYPE_UNSUPPORTED, 'The XLSX compression method is unsupported.');
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function cellColumn(ref) {
  const letters = String(ref || '').match(/^[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
  let value = 0;
  for (const char of letters) value = value * 26 + char.charCodeAt(0) - 64;
  return value - 1;
}

export async function parseXlsx(input) {
  const entries = await unzipEntries(input);
  const decoder = new globalThis.TextDecoder();
  const sharedXml = entries['xl/sharedStrings.xml'] ? decoder.decode(entries['xl/sharedStrings.xml']) : '';
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map((match) =>
    decodeEntities([...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((part) => part[1]).join(''))
  );
  const sheetName = Object.keys(entries).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).sort()[0];
  if (!sheetName) throw new AppError(ErrorCode.FILE_TYPE_UNSUPPORTED, 'The workbook has no readable worksheet.');
  const xml = decoder.decode(entries[sheetName]); const rows = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
    const row = [];
    for (const match of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
      const attrs = match[1]; const body = match[2];
      const ref = /\br="([^"]+)"/i.exec(attrs)?.[1] || `A${rows.length + 1}`;
      const type = /\bt="([^"]+)"/i.exec(attrs)?.[1] || '';
      const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/i.exec(body)?.[1];
      const inline = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi)].map((part) => part[1]).join('');
      let value = inline ? decodeEntities(inline) : decodeEntities(raw || '');
      if (type === 's') value = shared[Number(value)] ?? '';
      else if (type === 'b') value = value === '1';
      else if (!type && value !== '' && Number.isFinite(Number(value))) value = Number(value);
      row[cellColumn(ref)] = value;
    }
    rows.push(Array.from({ length: row.length }, (_, index) => row[index] ?? ''));
  }
  return rows;
}

export async function parseStructuredFile({ name, text, arrayBuffer }) {
  const extension = String(name || '').split('.').pop().toLowerCase();
  if (extension === 'csv') return parseCsv(text);
  if (extension === 'txt') return String(text || '').split(/\r?\n/).map((line) => [line]);
  if (extension === 'json') {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      const records = parsed.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
      if (records.length === parsed.length && records.length) {
        const headers = [...new Set(records.flatMap((item) => Object.keys(item)))];
        return [headers, ...records.map((item) => headers.map((key) => item[key] ?? ''))];
      }
      return parsed.map((item) => [typeof item === 'object' ? JSON.stringify(item) : item]);
    }
    return [['key', 'value'], ...Object.entries(parsed || {}).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value])];
  }
  if (extension === 'xlsx') return parseXlsx(arrayBuffer);
  throw new AppError(ErrorCode.FILE_TYPE_UNSUPPORTED, `.${extension || 'unknown'} structured files are not supported.`);
}

export function structuredRowsToText(rows, maxRows = 200) {
  const visible = rows.slice(0, maxRows);
  return `${serializeCsv(visible)}${rows.length > maxRows ? `\n...[${rows.length - maxRows} more rows omitted]` : ''}`;
}
