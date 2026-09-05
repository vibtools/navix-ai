import { AppError, ErrorCode } from './errorContract.js';

export const FILE_LIMITS = Object.freeze({
  maxFiles: 8,
  maxFileBytes: 8 * 1024 * 1024,
  maxPdfPages: 100,
  maxTextCharacters: 120_000
});

const ALLOWED_EXTENSIONS = new Set(['txt', 'csv', 'json', 'xlsx', 'pdf', 'png', 'jpg', 'jpeg', 'webp']);

export function getFileExtension(name = '') {
  const match = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

export function validateUploadBatch(files) {
  if (!Array.isArray(files) || files.length === 0) return [];
  if (files.length > FILE_LIMITS.maxFiles) {
    throw new AppError(ErrorCode.FILE_TOO_LARGE, `Upload at most ${FILE_LIMITS.maxFiles} files per request.`);
  }
  return files.map((file) => {
    const extension = getFileExtension(file?.name);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new AppError(ErrorCode.FILE_TYPE_UNSUPPORTED, `.${extension || 'unknown'} files are not supported.`);
    }
    if (!Number.isFinite(file?.size) || file.size < 0 || file.size > FILE_LIMITS.maxFileBytes) {
      throw new AppError(ErrorCode.FILE_TOO_LARGE, `${file?.name || 'File'} exceeds the 8 MB limit.`);
    }
    return { file, extension };
  });
}

export function limitExtractedText(text) {
  const value = typeof text === 'string' ? text : '';
  return {
    text: value.slice(0, FILE_LIMITS.maxTextCharacters),
    truncated: value.length > FILE_LIMITS.maxTextCharacters
  };
}
