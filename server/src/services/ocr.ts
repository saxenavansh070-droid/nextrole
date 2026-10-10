import path from 'node:path';
import { createRequire } from 'node:module';

const requireCjs = createRequire(__filename);

/** Minimal structural types so we never depend on optional type packages. */
type CanvasContext2D = {
  fillStyle: string;
  fillRect(x: number, y: number, width: number, height: number): void;
};
type CanvasSurface = {
  width: number;
  height: number;
  getContext(kind: '2d'): CanvasContext2D;
  toBuffer(mime: 'image/png'): Buffer;
};
type CanvasModule = { createCanvas(width: number, height: number): CanvasSurface };

type PdfjsViewport = { width: number; height: number };
type PdfjsRenderPage = {
  getViewport(options: { scale: number }): PdfjsViewport;
  render(options: Record<string, unknown>): { promise: Promise<void> };
  cleanup(): void;
};
type PdfjsModule = {
  getDocument(params: Record<string, unknown>): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<PdfjsRenderPage>;
      destroy(): Promise<void>;
    }>;
  };
};

type TesseractWorker = {
  recognize(image: Buffer): Promise<{ data: { text: string } }>;
  terminate(): Promise<void>;
};

/** Scanned resumes are slow - cap what we OCR per file. */
const MAX_OCR_PAGES = 8;
/** ~190 DPI; enough for resume-sized type without tripling OCR time. */
const RENDER_SCALE = 2.6;

/**
 * Language data ships in the @tesseract.js-data/eng package
 * (node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz), so OCR
 * works fully offline - no CDN download at analysis time.
 */
function resolveLangPath(): string {
  const entry = requireCjs.resolve('@tesseract.js-data/eng');
  return path.join(path.dirname(entry), '4.0.0');
}

/**
 * OCR fallback for PDFs with no text layer (scanned or exported-as-image
 * resumes). Renders each page through pdf.js onto a node-canvas surface and
 * reads it with Tesseract's English model. Returns '' when the OCR stack is
 * unavailable or finds nothing, so callers can fall back to a clear error.
 */
export async function ocrPdf(bytes: Uint8Array): Promise<string> {
  const canvasModule = requireCjs('canvas') as CanvasModule;
  const pdfjs = requireCjs('pdfjs-dist/legacy/build/pdf.js') as PdfjsModule;
  const { createWorker } = requireCjs('tesseract.js') as {
    createWorker: (
      langs: string,
      oem: number,
      options: Record<string, unknown>,
    ) => Promise<TesseractWorker>;
  };

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    disableFontFace: true,
    useWorkerFetch: false,
    verbosity: 0,
  }).promise;

  const pages: string[] = [];
  let worker: TesseractWorker | null = null;

  try {
    const limit = Math.min(doc.numPages, MAX_OCR_PAGES);
    for (let pageNumber = 1; pageNumber <= limit; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const surface = canvasModule.createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      const context = surface.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, surface.width, surface.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const png = surface.toBuffer('image/png');
      page.cleanup();

      if (!worker) {
        worker = await createWorker('eng', 1, {
          langPath: resolveLangPath(),
          gzip: true,
          cacheMethod: 'none',
        });
      }
      const result = await worker.recognize(png);
      const text = (result.data.text ?? '').replace(/\n{3,}/g, '\n\n').trim();
      if (text) pages.push(text);
    }
  } finally {
    if (worker) await worker.terminate().catch(() => undefined);
    await doc.destroy().catch(() => undefined);
  }

  return pages.join('\n');
}
