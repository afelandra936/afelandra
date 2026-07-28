export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="31" stroke="var(--leaf)" strokeWidth="2" />
      <path
        d="M32 46C32 46 18 38 18 24C18 17 23 12 32 12C41 12 46 17 46 24C46 38 32 46 32 46Z"
        fill="var(--gold-soft)"
        stroke="var(--leaf)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M32 46V20" stroke="var(--leaf)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
