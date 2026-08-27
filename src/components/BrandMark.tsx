interface BrandMarkProps {
  className?: string;
  label?: string;
}

export function BrandMark({ className, label = "Bossnet Proceduri" }: BrandMarkProps) {
  return (
    <svg
      aria-label={label}
      className={className}
      role="img"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M32 3 56 17v30L32 61 8 47V17L32 3Z" fill="#050505" stroke="#ffc000" strokeWidth="3" />
      <path d="M20 18h7v28h-7z" fill="#fff" />
      <path d="m29 18 13 0 7 7-7 7H29v-5h11l2-2-2-2H29v-5Z" fill="#ffc000" />
      <path d="m29 34 13 0 7 7-7 7H29v-5h11l2-2-2-2H29v-5Z" fill="#fff" />
    </svg>
  );
}
