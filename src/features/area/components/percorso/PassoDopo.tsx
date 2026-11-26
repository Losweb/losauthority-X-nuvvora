import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/** La striscia «il passo dopo» alla fine di una fase: una frase e dove porta. */
export function PassoDopo({ testo, href }: { testo: string; href: string }) {
  return (
    <Link to={href} className="flex items-center justify-between gap-3 rounded-lg border border-foreground/25 bg-card p-3.5 text-[14px] font-medium transition-colors hover:bg-surface-hover">
      <span>{testo}</span>
      <ArrowRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}
