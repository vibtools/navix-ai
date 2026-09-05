import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { FILE_LIMITS, limitExtractedText } from '../core/filePolicy.js';

export async function extractPdfText(arrayBuffer) {
  const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  let textContent = '';
  try {
    if (pdf.numPages > FILE_LIMITS.maxPdfPages) {
      throw new Error(`PDF exceeds the ${FILE_LIMITS.maxPdfPages}-page limit.`);
    }

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      try {
        const text = await page.getTextContent();
        textContent += `${text.items.map((item) => item.str).join(' ')}\n`;
        if (textContent.length > FILE_LIMITS.maxTextCharacters) break;
      } finally {
        page.cleanup?.();
      }
    }
    return limitExtractedText(textContent);
  } finally {
    try {
      await pdf.cleanup?.();
    } finally {
      await pdf.destroy?.();
    }
  }
}
