import path from 'node:path';
import { createRequire } from 'node:module';

const requireCjs = createRequire(__filename);

type PdfParseResult = { text?: string; numpages?: number };
type MammothModule = {
  extractRawText(input: { buffer: Buffer }): Promise<{ value: string; messages: unknown[] }>;
};

/** Minimal structural types for the pdf.js legacy (CJS) build. */
type PdfjsTextContent = { items: Array<{ str?: unknown }> };
type PdfjsPage = { getTextContent(): Promise<PdfjsTextContent> };
type PdfjsDocument = {
  numPages: number;
  getPage(n: number): Promise<PdfjsPage>;
  destroy(): Promise<void>;
};
type PdfjsModule = {
  getDocument(params: Record<string, unknown>): { promise: Promise<PdfjsDocument> };
};

// Required from the package internals so pdf-parse never enters its debug mode.
const pdfParse = requireCjs('pdf-parse/lib/pdf-parse.js') as (
  buffer: Uint8Array,
) => Promise<PdfParseResult>;
const mammoth = requireCjs('mammoth') as MammothModule;
// Third engine: OCR for scanned/image-only PDFs (lazy - only loads on demand).
const ocrPdf = (): ((bytes: Uint8Array) => Promise<string>) =>
  requireCjs('./ocr').ocrPdf as (bytes: Uint8Array) => Promise<string>;

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
  }
}

/**
 * Body-parser delivers uploaded bodies as *views* into Node's pooled
 * ArrayBuffer (e.g. 64 KB of shared memory around a 2 KB PDF). Copy such views
 * into a tightly-sized buffer first.
 */
function detach(input: Buffer): Buffer {
  if (input.byteOffset === 0 && input.length === input.buffer.byteLength) return input;
  const out = Buffer.alloc(input.length); // exact-size, non-pooled ArrayBuffer
  input.copy(out);
  return out;
}

/**
 * Second opinion for PDFs the bundled pdf.js 1.x (2018) engine trips over:
 * modern layouts, unusual encodings, two-column exports. pdf.js 3.x is far
 * more tolerant, so we take whichever engine reads more text.
 */
async function extractWithPdfjs(bytes: Uint8Array): Promise<string> {
  const pdfjs = requireCjs('pdfjs-dist/legacy/build/pdf.js') as PdfjsModule;
  const doc = await pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    disableFontFace: true,
    useWorkerFetch: false,
    verbosity: 0,
  }).promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ')
        .trim();
      if (text) pages.push(text);
    }
    return pages.join('\n');
  } finally {
    await doc.destroy().catch(() => undefined);
  }
}

async function extractPdf(bytes: Uint8Array, fileName: string): Promise<string> {
  let text = '';
  let primaryError: unknown;

  // Engine 1: pdf-parse (fast, covers most resumes).
  try {
    const result = await pdfParse(bytes);
    text = (result.text ?? '').trim();
  } catch (cause) {
    primaryError = cause;
  }

  // Engine 2: pdf.js 3.x when engine 1 failed or read almost nothing.
  if (text.length < 40) {
    try {
      const alt = await extractWithPdfjs(bytes);
      if (alt.trim().length > text.length) text = alt.trim();
    } catch (cause) {
      console.warn(
        '[extract] pdfjs fallback failed:',
        cause instanceof Error ? cause.message : cause,
      );
    }
  }

  // Engine 3: OCR for scanned/image-only PDFs - there is no text layer at
  // all, so the only way to read them is to look at the rendered page.
  if (text.length < 40) {
    try {
      console.log(`[extract] no text layer in ${fileName}; running OCR...`);
      const alt = await ocrPdf()(bytes);
      if (alt.trim().length > text.length) text = alt.trim();
      console.log(`[extract] OCR read ${text.length} chars from ${fileName}`);
    } catch (cause) {
      console.warn('[extract] ocr failed:', cause instanceof Error ? cause.message : cause);
    }
  }

  if (!text) {
    if (primaryError) {
      console.warn(
        '[extract] pdf-parse failed:',
        primaryError instanceof Error ? primaryError.message : primaryError,
      );
    }
    console.warn(`[extract] no text extracted from ${fileName} (0 chars)`);
    throw new ExtractionError(
      'We could not read this PDF, even with OCR. The file may be damaged or password-protected - try re-exporting it from your editor, or copy your resume text and use the "Paste text" tab instead.',
    );
  }

  return text;
}

const TEXT_EXTENSIONS = ['.txt', '.text', '.md', '.csv', '.rtf'];

/** Extracts plain text from a PDF, DOCX, or plain-text resume. */
export async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  const bytes = detach(buffer);
  const ext = path.extname(fileName ?? '').toLowerCase();

  if (ext === '.pdf') {
    // pdf.js (bundled inside pdf-parse) re-copies incoming data through the
    // deprecated `new Buffer(value)` constructor, which lands in Node's shared
    // memory pool with a garbage tail it then parses - breaking whenever other
    // modules (mongoose/bson) have dirtied the pool. A plain Uint8Array clones
    // to an exact-size copy instead, which parses reliably everywhere.
    const pdfBytes = new Uint8Array(bytes);
    return extractPdf(pdfBytes, fileName);
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer: bytes });
    const text = (result.value ?? '').trim();
    if (!text) {
      throw new ExtractionError(
        'That Word document appears to be empty or image-based. Paste your resume text instead.',
      );
    }
    return text;
  }

  if (ext === '.doc') {
    throw new ExtractionError(
      'Legacy .doc files are not supported. Re-save your resume as .docx, PDF, or .txt and try again.',
    );
  }

  if (ext && !TEXT_EXTENSIONS.includes(ext) && ext !== '') {
    throw new ExtractionError(
      `We could not read "${ext}" files. Please upload a PDF, Word document, or plain text file.`,
    );
  }

  return bytes.toString('utf-8');
}

/** Normalises extracted resume text. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
