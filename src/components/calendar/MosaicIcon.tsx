import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type MosaicIconProps = {
  href: string;
  className?: string;
};

export function MosaicIcon({ href, className }: MosaicIconProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-surface ring-1 ring-accent/30",
        className,
      )}
      aria-label="View my mosaic"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect x="1" y="1" width="4" height="4" fill="#D4AF37" />
        <rect x="7" y="1" width="4" height="4" fill="#00B2F6" />
        <rect x="13" y="1" width="4" height="4" fill="#9379E0" />
        <rect x="1" y="7" width="4" height="4" fill="#FA7C69" />
        <rect x="7" y="7" width="4" height="4" fill="#5AE072" />
        <rect x="13" y="7" width="4" height="4" fill="#F863B7" />
        <rect x="1" y="13" width="4" height="4" fill="#FFC95E" />
        <rect x="7" y="13" width="4" height="4" fill="#3BEBF5" />
        <rect x="13" y="13" width="4" height="4" fill="#E07ECB" />
      </svg>
    </Link>
  );
}
