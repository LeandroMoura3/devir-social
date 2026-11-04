import Link from "next/link";

// Anterior = mais antigo; próxima = mais recente.
export function NavegacaoConteudos({
  anterior,
  proxima,
  href,
}: {
  anterior?: number;
  proxima?: number;
  href: (id: number) => string;
}) {
  if (anterior === undefined && proxima === undefined) return null;
  return (
    <nav className="flex justify-between gap-2 text-sm">
      {anterior !== undefined ? (
        <Link href={href(anterior)} className="botao-secundario">
          ← Anterior (#{anterior})
        </Link>
      ) : (
        <span />
      )}
      {proxima !== undefined && (
        <Link href={href(proxima)} className="botao-secundario">
          Próxima (#{proxima}) →
        </Link>
      )}
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
