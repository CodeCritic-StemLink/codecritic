// The CodeCritic mark: a speech bubble with code inside it.
//
// The same shape as app/icon.svg, which is the browser tab icon. They are drawn twice
// rather than shared from one file because Next.js needs the tab icon to be a real
// .svg file sitting in app/, while this one has to be inline so it can take colours
// from the theme. If the mark ever changes, both files change together.
//
// currentColor on the bubble is what makes it work in light and dark mode without a
// second copy: the bubble takes whatever text colour it is sitting on.

type Props = {
  /** Tailwind size classes. Defaults to the size used in the navigation bar. */
  className?: string;
};

export function BrandMark({ className = "size-[26px]" }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="CodeCritic"
      fill="none"
    >
      <rect width="32" height="32" rx="7" className="fill-primary" />

      <path
        d="M7 8.5h18a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H13.2L9 25.5V21.5H7A1.5 1.5 0 0 1 5.5 20V10A1.5 1.5 0 0 1 7 8.5Z"
        className="fill-primary-foreground"
      />

      <g
        className="stroke-primary"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.3 12.4 9 15.1l3.3 2.7" />
        <path d="M19.7 12.4 23 15.1l-3.3 2.7" />
        <path d="M17 11.6l-2 7" />
      </g>
    </svg>
  );
}
