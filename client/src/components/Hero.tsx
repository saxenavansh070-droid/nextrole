import { content } from '../lib/content';

export default function Hero() {
  const { hero } = content;

  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="flex items-start justify-between gap-8">
        <div className="max-w-[760px]">
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-clay" aria-hidden="true" />
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-moss">
              {hero.eyebrow}
            </span>
          </div>

          <h1 className="mt-5 text-[clamp(34px,5.2vw,54px)] font-extrabold leading-[1.04] tracking-[-0.03em] text-ink">
            {hero.titleLead}
            <span className="font-serif text-[1.06em] font-normal italic text-clay">
              {hero.titleAccent}
            </span>
          </h1>

          <p className="mt-5 max-w-[560px] text-[16px] leading-relaxed text-fern">
            {hero.subtitle}
          </p>
        </div>

        <div className="hidden shrink-0 items-start gap-3 rounded-xl border border-black/10 bg-white/70 px-4 py-3.5 shadow-[0_1px_2px_rgba(17,55,42,0.04)] lg:flex">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-clay text-[13px] font-bold text-white">
            {content.brand.mark}
          </span>
          <div>
            <p className="text-[13.5px] font-bold leading-tight text-ink">{hero.privacyTitle}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-moss">{hero.privacyText}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
