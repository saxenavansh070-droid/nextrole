import { useLayoutEffect, useRef, useState } from 'react';
import { Check, FileText, Upload } from 'lucide-react';
import { content } from '../lib/content';
import type { AnalyzeStatus } from '../types';

type Tab = 'upload' | 'paste';

type ExperienceCardProps = {
  status: AnalyzeStatus;
  error: string | null;
  fileName: string | null;
  onFile: (file: File) => void;
  onText: (text: string) => void;
};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = '.pdf,.docx,.txt,.text';
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.text'];

export default function ExperienceCard({ status, error, fileName, onFile, onText }: ExperienceCardProps) {
  const copy = content.experience;
  const [tab, setTab] = useState<Tab>('upload');
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState('');
  const [wantPicker, setWantPicker] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loading = status === 'loading';

  // Clicking the "Upload a file" tab opens the file browser right away.
  useLayoutEffect(() => {
    if (!wantPicker) return;
    const input = inputRef.current;
    if (input) {
      input.click();
      setWantPicker(false);
    }
  }, [wantPicker, tab]);

  function handleUploadTab() {
    if (loading) return;
    setTab('upload');
    setWantPicker(true);
  }

  /** Validates the picked file and explains anything we cannot read. */
  function pickFile(file: File | undefined | null) {
    if (!file || loading) return;
    const extension = `.${(file.name.split('.').pop() ?? '').toLowerCase()}`;
    if (file.size === 0) {
      setFileError('That file is empty. Please choose your resume file again.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError(
        `"${file.name}" is larger than 10 MB. Try exporting a smaller PDF, or use the ${copy.tabPaste} tab.`,
      );
      return;
    }
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setFileError(
        `"${file.name}" is a ${extension === '.' ? 'file without an extension' : extension + ' file'}. Please choose a PDF, Word (.docx), or plain text resume.`,
      );
      return;
    }
    setFileError(null);
    onFile(file);
  }

  function submitText() {
    if (loading) return;
    onText(text);
  }

  const tabClass = (active: boolean) =>
    [
      'relative -mb-px pb-3 text-[14.5px] font-semibold transition-colors',
      active ? 'text-white' : 'text-white/45 hover:text-white/75',
    ].join(' ');

  return (
    <section className="rounded-2xl bg-forest p-6 text-white shadow-[0_24px_50px_-32px_rgba(13,44,32,0.85)]">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/45 text-[12px] font-semibold">
          {copy.step}
        </span>
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/55">
            {copy.label}
          </p>
          <p className="text-[21px] font-bold leading-tight">{copy.title}</p>
        </div>
      </div>

      <p className="mt-4 text-[14.5px] leading-relaxed text-white/70">{copy.description}</p>

      <div className="mt-5 flex gap-7 border-b border-white/15" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upload'}
          onClick={handleUploadTab}
          className={tabClass(tab === 'upload')}
        >
          {copy.tabUpload}
          {tab === 'upload' && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-leaf" />
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'paste'}
          onClick={() => setTab('paste')}
          className={tabClass(tab === 'paste')}
        >
          {copy.tabPaste}
          {tab === 'paste' && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-leaf" />
          )}
        </button>
      </div>

      {tab === 'upload' ? (
        <div>
          <label
            onDragOver={(event) => {
              event.preventDefault();
              if (!loading) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              pickFile(event.dataTransfer.files?.[0]);
            }}
            className={[
              'mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl bg-sand px-4 py-9 text-center transition',
              dragging ? 'ring-2 ring-clay' : 'hover:bg-[#e9e6d8]',
              loading ? 'pointer-events-none opacity-60' : '',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(event) => {
                pickFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/70 text-forest shadow-sm">
              <Upload size={18} strokeWidth={2.2} />
            </span>
            <span className="mt-3 text-[13.5px] text-fern">
              {dragging ? (
                <span className="font-semibold text-ink">{copy.dropHere}</span>
              ) : (
                <>
                  {copy.browseLead}{' '}
                  <span className="font-bold text-ink underline underline-offset-2">
                    {copy.browseLink}
                  </span>
                </>
              )}
            </span>
            <span className="mt-1.5 text-[11.5px] text-moss">{copy.fileTypes}</span>
          </label>

          {fileError && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-[#ffb494]/50 bg-[#ffb494]/15 px-3 py-2.5 text-[13px] leading-snug text-[#ffd9c9]"
            >
              {fileError}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={7}
            placeholder={copy.pastePlaceholder}
            className="w-full resize-none rounded-xl bg-sand p-4 text-[13.5px] leading-relaxed text-ink placeholder:text-moss focus:outline-none focus:ring-2 focus:ring-clay/60"
          />
          <button
            type="button"
            onClick={submitText}
            disabled={loading || text.trim().length === 0}
            className="mt-3 w-full rounded-lg bg-clay px-4 py-2.5 text-[14.5px] font-bold text-white transition hover:bg-clay-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.submit}
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2.5 text-[13.5px] text-white/75">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-leaf" />
          {copy.loading}
        </div>
      )}

      {!loading && fileName && status === 'ready' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[12.5px] text-white/80">
          <FileText size={14} className="shrink-0" />
          <span className="truncate">{fileName}</span>
          <Check size={14} className="ml-auto shrink-0 text-leaf" />
        </div>
      )}

      {!loading && error && (
        <div className="mt-4 rounded-lg border border-clay/40 bg-clay/15 px-3 py-2.5 text-[13px] leading-snug text-[#ffd9c9]">
          {error}
        </div>
      )}
    </section>
  );
}
