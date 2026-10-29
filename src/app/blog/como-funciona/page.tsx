import Link from "next/link";
import { MenuBlog } from "../menu";

export const metadata = { title: "Como funciona · Devir Social" };

export default function ComoFunciona() {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <article className="prosa">
        <h1 className="text-2xl font-semibold">Devir Social: projeto piloto</h1>

        <h2>O que é</h2>
        <p>
          Uma ferramenta experimental de comunicação coletiva. Os participantes enviam conteúdos, votam nos conteúdos
          uns dos outros, e o resultado é publicado seguindo regras claras, públicas e sem espaço para decisões
          arbitrárias.
        </p>

        <h2>Como funciona</h2>
        <ol>
          <li>Você envia um conteúdo: uma imagem com um texto.</li>
          <li>
            O grupo debate nos comentários e vota <strong>sim</strong>, <strong>indiferente</strong> ou{" "}
            <strong>não</strong> durante o prazo do conteúdo. O indiferente é ilustrativo: não entra na contagem.
          </li>
          <li>
            Para o voto contar, é preciso participar com regularidade. Quem votou em pelo menos uma parte mínima dos
            conteúdos do ciclo anterior é <strong>participante</strong>; os demais são <strong>espectadores</strong>{" "}
            e votam sem que o voto conte. Quem acabou de entrar é participante garantido no ciclo seguinte.
          </li>
          <li>
            O resultado define o destaque: a maioria vira post próprio no Instagram, a minoria entra junto, e a tribuna
            livre aparece no texto da legenda.
          </li>
          <li>
            <strong>Nenhum conteúdo fica de fora.</strong> Tudo é publicado neste blog, com o texto completo e os votos.
          </li>
        </ol>

        <h2>O que ainda está em construção (e dizemos abertamente)</h2>
        <ul>
          <li>
            Nesta fase, as regras são definidas pelo idealizador do projeto. A intenção é que, com o uso, o projeto se
            torne autônomo.
          </li>
          <li>
            Ainda não temos como garantir que cada pessoa tenha só uma conta. Por isso, a participação é por convite.
          </li>
          <li>O algoritmo é público. Qualquer pessoa pode criar a sua própria versão.</li>
        </ul>

        <h2>Responsabilidade</h2>
        <p>Cada participante responde, inclusive legalmente, pelo que envia.</p>

        <h2>Quer saber mais?</h2>
        <p>
          Leia <Link href="/blog/por-que">por que criamos o Devir Social</Link> e as{" "}
          <Link href="/blog/regras">regras completas do piloto</Link>. Os números do projeto estão no{" "}
          <Link href="/painel">painel público</Link>.
        </p>
      </article>
    </div>
  );
}
