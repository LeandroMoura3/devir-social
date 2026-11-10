import { ladoDoVoto, NOME_VOTO, type Voto } from "@/lib/regras";

// Selos do debate (app e blog): voto de quem comentou, "autor", "espectador" e marcações.
export const SELO = "rounded-full px-2 py-0.5 text-[11px] font-medium leading-4";
export const SELO_NEUTRO = `${SELO} border border-border text-muted`;

export function SeloVoto({ voto, ehAutor, semVoto }: { voto?: Voto | null; ehAutor?: boolean; semVoto: string }) {
  if (ehAutor) return <span className={`${SELO} bg-accent text-accent-foreground`}>autor</span>;
  if (!voto) return <span className={SELO_NEUTRO}>{semVoto}</span>;
  const lado = ladoDoVoto(voto);
  const cor =
    lado === "apoio"
      ? "bg-[#e5f3ea] text-[#1d6b3b]"
      : lado === "protesto"
        ? "bg-[#fde8ea] text-[#a3242f]"
        : "bg-border text-foreground";
  return <span className={`${SELO} ${cor}`}>{NOME_VOTO[voto]}</span>;
}
