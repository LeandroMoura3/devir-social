import { TextoFormatado } from "./texto-formatado";

// Quadro no formato de um post do Instagram: usado na prévia dos conteúdos abertos e nos cancelados.
export function MolduraInstagram({ imagemUrl, texto, rotulo }: { imagemUrl: string; texto: string; rotulo: string }) {
  return (
    <figure className="mx-auto my-0 flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card">
      <figcaption className="flex items-center gap-2 px-3 py-2 text-sm font-semibold">
        <img src="/logo.png" alt="" className="size-7 rounded-full border border-border" />
        devir_social
        <span className="ml-auto text-xs font-normal text-muted">{rotulo}</span>
      </figcaption>
      <img src={imagemUrl} alt="" className="w-full" />
      <div className="px-3 py-3 text-sm">
        <TextoFormatado texto={texto} />
      </div>
    </figure>
  );
}
