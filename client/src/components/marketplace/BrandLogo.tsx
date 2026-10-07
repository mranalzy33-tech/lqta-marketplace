import { useLocale } from "@/contexts/LocaleContext";

type BrandLogoProps = {
  variant?: "mark" | "full";
  className?: string;
  alt?: string;
  ariaHidden?: boolean;
};

export default function BrandLogo({
  variant = "mark",
  className = "",
  alt,
  ariaHidden = false,
}: BrandLogoProps) {
  const { language } = useLocale();
  const isMark = variant === "mark";

  return (
    <img
      src={
        isMark
          ? "/images/lqta-logo-mark-trim.png"
          : "/images/lqta-logo-full-trim.png"
      }
      alt={alt ?? (language === "ar" ? "شعار لقطة" : "LQTA logo")}
      width={isMark ? 252 : 415}
      height={isMark ? 385 : 538}
      decoding="async"
      aria-hidden={ariaHidden}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
      className={`block shrink-0 object-contain ${className}`}
    />
  );
}
