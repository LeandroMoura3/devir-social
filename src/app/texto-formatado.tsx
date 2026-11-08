import { trechos } from "@/lib/formatacao";

// quebras=false junta as linhas (resumos de uma ou duas linhas, como os cartões).
export function TextoFormatado({
  texto,
  className = "",
  quebras = true,
}: {
  texto: string;
  className?: string;
  quebras?: boolean;
}) {
  return (
    <p className={`${quebras ? "whitespace-pre-wrap" : ""} ${className}`}>
      {trechos(texto).map((t, i) =>
        t.estilo === "negrito" ? <strong key={i}>{t.texto}</strong> : t.estilo === "italico" ? <em key={i}>{t.texto}</em> : t.texto,
      )}
    </p>
  );
}
