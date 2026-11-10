import type { ReactNode } from "react";
import Link from "next/link";

// Anterior = mais antigo; próxima = mais recente. "meio" fica entre os dois (ex.: cancelar o próprio conteúdo).
// Grade de 3 colunas (1fr auto 1fr): o do meio fica sempre centralizado, exista ou não o botão de cada lado.
// No celular, os botões mostram só o número, para os três caberem numa linha.
export function NavegacaoConteudos({
  anterior,
  proxima,
  href,
  meio,
}: {
  anterior?: number;
  proxima?: number;
  href: (id: number) => string;
  meio?: ReactNode;
}) {
  if (anterior === undefined && proxima === undefined && !meio) return null;
  return (
    <nav className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
      {anterior !== undefined ? (
        <Link href={href(anterior)} className="botao-secundario col-start-1 row-start-1 justify-self-start">
          ← <span className="hidden sm:inline">&nbsp;Anterior&nbsp;</span>(#{anterior})
        </Link>
      ) : null}
      {meio}
      {proxima !== undefined ? (
        <Link href={href(proxima)} className="botao-secundario col-start-3 row-start-1 justify-self-end">
          <span className="hidden sm:inline">Próxima&nbsp;</span>(#{proxima}) →
        </Link>
      ) : null}
    </nav>
  );
}

export function vizinhos(ids: number[], atual: number): { anterior?: number; proxima?: number } {
  const ordenados = [...ids].sort((a, b) => a - b);
  return {
    anterior: ordenados.filter((id) => id < atual).at(-1),
    proxima: ordenados.find((id) => id > atual),
  };
}
