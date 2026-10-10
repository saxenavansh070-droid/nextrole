type LogoMarkProps = {
  size?: number;
};

/** The green "bars" mark shown next to the nextrole wordmark. */
export default function LogoMark({ size = 30 }: LogoMarkProps) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[7px] bg-forest"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 20 20" fill="none">
        <rect x="1.5" y="11" width="4" height="7.5" rx="1.4" fill="#8fb877" />
        <rect x="8" y="7" width="4" height="11.5" rx="1.4" fill="#b5d891" />
        <rect x="14.5" y="2.5" width="4" height="16" rx="1.4" fill="#d9edb0" />
      </svg>
    </span>
  );
}
