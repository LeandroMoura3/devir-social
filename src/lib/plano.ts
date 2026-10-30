import { carregarConteudos, type ConteudoVisao } from "@/lib/conteudos";
import { planejarPublicacao, type ConteudoClassificado, type Post } from "@/lib/regras";
import type { criarClienteServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

export type ItemPlano = ConteudoVisao & ConteudoClassificado;

// Mesmo cálculo para a tela e para a publicação: o servidor nunca confia na legenda vinda do navegador.
export async function montarPlano(supabase: Cliente, agora: number): Promise<Post<ItemPlano>[]> {
  const pendentes = (await carregarConteudos(supabase)).filter(
    (c) => !c.removidoEm && !c.publicadoEm && Date.parse(c.fechaEm) <= agora && c.resultado,
  );
  return planejarPublicacao(
    pendentes.map((c) => ({
      ...c,
      favor: c.resultado!.favor,
      contra: c.resultado!.contra,
      detalhe: c.resultado!.detalhe,
      faixa: c.resultado!.faixa,
    })),
  );
}

// Um post é identificado pelo conteúdo da sua primeira imagem.
export function chaveDoPost(post: Post<ItemPlano>): number {
  return post.imagens[0].id;
}
