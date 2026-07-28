import Image from "next/image";

type Variant = "on-dark" | "on-light";

const LOGO_SRC: Record<Variant, string> = {
  "on-dark": "/logo-blanco.png",
  "on-light": "/logo-negro.png",
};

export function BrandMark({
  variant = "on-dark",
  className,
  priority,
}: {
  variant?: Variant;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={LOGO_SRC[variant]}
      alt="Afelandra Calzados"
      width={1126}
      height={423}
      sizes="220px"
      className={className}
      priority={priority}
    />
  );
}
