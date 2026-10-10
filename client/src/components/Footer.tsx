import { content } from '../lib/content';

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-cream">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-2 px-6 py-6 text-[13px] text-moss sm:flex-row">
        <p>{content.footer.text}</p>
        <p>{content.footer.rights}</p>
      </div>
    </footer>
  );
}
