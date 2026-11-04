import { trechos } from "@/lib/formatacao";

export function TextoFormatado({ texto, className = "" }: { texto: string; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap ${className}`}>
      {trechos(texto).map((t, i) => (t.negrito ? <strong key={i}>{t.texto}</strong> : t.texto))}
    </p>
  );
}
