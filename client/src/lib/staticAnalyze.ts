import * as pdfjs from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import mammoth from 'mammoth/mammoth.browser';
import { matchLocally } from './localMatch';
import type { AnalyzeResponse } from '../types';

/**
 * Fully client-side analysis used by the static (GitHub Pages) build.
 * The resume never leaves the device: pdf.js extracts text, Tesseract OCR
 * reads scanned pages, and the local matcher scores the role library -
 * the exact same engine the Node server runs.
 */

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

const MIN_TEXT_CHARS = 40;
const MAX_OCR_PAGES = 6;

type PdfjsDoc = {
  numPages: number;
  getPage(n: number): Promise<PdfjsPage>;
  destroy(): Promise<void>;
};
type PdfjsPage = {
  getViewport(options: { scale: number }): { width: number; height: number };
  getTextContent(): Promise<{ items: unknown[] }>;
  render(options: Record<string, unknown>): { promise: Promise<void> };
  cleanup(): void;
};

async function openPdf(bytes: Uint8Array): Promise<PdfjsDoc> {
  return pdfjs.getDocument({
    data: bytes,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  }).promise;
}

/** Engine 1: text layer via pdf.js. */
async function extractPdfText(doc: PdfjsDoc): Promise<string> {
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => {
        const str = (item as { str?: unknown }).str;
        return typeof str === 'string' ? str : '';
      })
      .join(' ')
      .trim();
    if (text) pages.push(text);
    page.cleanup();
  }
  return pages.join('\n');
}

/** Engine 2: OCR - render each page and read it with Tesseract. */
async function ocrPdf(doc: PdfjsDoc): Promise<string> {
  const worker = await createWorker('eng');
  const pages: string[] = [];
  try {
    const limit = Math.min(doc.numPages, MAX_OCR_PAGES);
    for (let i = 1; i <= limit; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2.4 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) continue;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      const text = (result.data.text ?? '').replace(/\n{3,}/g, '\n\n').trim();
      if (text) pages.push(text);
      page.cleanup();
    }
  } finally {
    await worker.terminate().catch(() => undefined);
  }
  return pages.join('\n');
}

async function extractPdf(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await openPdf(bytes);
  let text = '';
  try {
    text = (await extractPdfText(doc)).trim();
    if (text.length < MIN_TEXT_CHARS) {
      const alt = (await ocrPdf(doc)).trim();
      if (alt.length > text.length) text = alt;
    }
  } finally {
    await doc.destroy().catch(() => undefined);
  }
  if (!text) {
    throw new Error(
      'We could not read this PDF, even with OCR. The file may be damaged or password-protected - try re-exporting it, or use the "Paste text" tab instead.',
    );
  }
  return text;
}

async function extractDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = (result.value ?? '').trim();
  if (!text) {
    throw new Error('That Word document appears to be empty or image-based.');
  }
  return text;
}

/** Runs the full pipeline in the browser. Never uploads the resume. */
export async function analyzeInBrowser(input: File | string): Promise<AnalyzeResponse> {
  let text = '';

  if (typeof input === 'string') {
    text = input.trim();
  } else {
    const name = (input.name ?? '').toLowerCase();
    if (input.size === 0) throw new Error('That file is empty. Please choose your resume again.');
    if (name.endsWith('.pdf')) {
      text = await extractPdf(input);
    } else if (name.endsWith('.docx')) {
      text = await extractDocx(input);
    } else if (name.endsWith('.doc')) {
      throw new Error('Legacy .doc files are not supported. Re-save as .docx, PDF, or .txt.');
    } else {
      text = (await input.text()).trim();
    }
  }

  if (text.trim().length < 60) {
    throw new Error('Please add a little more resume text so we can find matches.');
  }

  const result = matchLocally(text);
  return {
    ok: true,
    saved: false,
    source: 'local',
    skills: result.skills,
    summary: result.summary,
    roles: result.roles,
    ...(typeof input !== 'string' ? { fileName: input.name } : {}),
  };
}
