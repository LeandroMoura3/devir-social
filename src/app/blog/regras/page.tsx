import { Suspense } from "react";
import Link from "next/link";
import { formatarData, instanteDaRequisicao } from "@/lib/datas";
import { criarClientePublico } from "@/lib/supabase/publico";
import { MenuBlog } from "../menu";

export const metadata = { title: "Regras do piloto · Devir Social" };

export default function Regras() {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <article className="prosa">
        <h1 className="text-2xl font-semibold">Regras do piloto (versão 0.5)</h1>
        <p className="text-sm text-muted">
          Estas regras estão implementadas no código aberto do app, em{" "}
          <a href="https://github.com/LeandroMoura3/devir-social/blob/main/src/lib/regras.ts">src/lib/regras.ts</a> e{" "}
          <a href="https://github.com/LeandroMoura3/devir-social/tree/main/supabase/migrations">supabase/migrations</a>.
          Em caso de dúvida, vale o código.
        </p>
        <p className="text-sm text-muted">
          Esta página traz sempre as regras completas em vigor. O que mudou entre versões fica no{" "}
          <a href="#historico">histórico</a>, no fim da página.
        </p>

        <h2>A. Regras que não mudam</h2>
        <p>Qualquer instância que mantiver estas três regras pode usar o nome Devir:</p>
        <ol>
          <li>
            <strong>Processo determinístico e verificável:</strong> regras e entradas são públicas, e qualquer pessoa pode
            recalcular o resultado. Toda decisão humana é registrada como uma etapa ainda não automatizada.
          </li>
          <li>
            <strong>Peso igual:</strong> nenhum voto vale mais que outro.
          </li>
          <li>
            <strong>Todo conteúdo é publicado, com visibilidade proporcional ao apoio.</strong> Cada autor responde pelo
            que diz. Exceções só por obrigação legal, sempre registradas.
          </li>
        </ol>

        <h2>B. Funcionamento</h2>

        <h3>1. Participantes</h3>
        <p>
          Cada pessoa tem um nome, que fica só com a coordenação, e um nome público, escolhido por ela, que aparece no
          app e neste blog. A participação no piloto é por convite.
        </p>

        <h3>2. Envio</h3>
        <p>Um conteúdo é uma imagem mais um texto. Cada conteúdo recebe um número (#).</p>

        <h3>3. Debate e votação</h3>
        <ul>
          <li>
            Cada conteúdo fica aberto pelo prazo definido nos parâmetros. Durante esse período acontecem, ao mesmo tempo,
            o debate (comentários com respostas em thread) e a votação.
          </li>
          <li>
            Cada pessoa escolhe <strong>um</strong> sentimento, em pares espelhados:
            <ul>
              <li>Identidade: <strong>me representa</strong> ou <strong>não me representa</strong>.</li>
              <li>Informação: <strong>utilidade pública</strong> ou <strong>falso ou enganoso</strong>.</li>
              <li>Justiça: <strong>expõe injustiça</strong> ou <strong>ofende ou ataca</strong>.</li>
              <li>Diálogo: <strong>merece ser ouvido</strong> ou <strong>só gera briga</strong>.</li>
            </ul>
            Os quatro primeiros contam como <strong>apoio</strong>; os quatro últimos, como <strong>protesto</strong>.
            Também é possível votar <strong>indiferente</strong>. Conteúdo ilegal não se resolve com voto: a
            coordenação aplica a exceção legal (item 11). O voto pode ser
            mudado até o fechamento. Ninguém vota no próprio conteúdo.
          </li>
          <li>
            Durante o debate, o voto atual de quem comenta aparece ao lado do nome, e muda se a pessoa mudar o voto. As
            contagens e os votos de quem não comentou ficam escondidos até o fechamento.
          </li>
          <li>
            O voto é nominal: depois da publicação, a lista de quem votou aparece neste blog, com o nome público. Não
            existe voto secreto.
          </li>
          <li>
            <strong>Indiferente é um posicionamento:</strong> quem escolhe indiferente diz que tanto faz o resultado.
            Por isso conta para o quórum (item 5) e como participação (item 4), mas não entra na porcentagem de apoio
            nem no Instagram. Aparece neste blog, à parte.
          </li>
        </ul>

        <h3>4. Ciclos: participantes e espectadores</h3>
        <ul>
          <li>O tempo é dividido em ciclos de duração fixa, iguais para todos.</li>
          <li>
            É <strong>participante</strong> num ciclo quem votou (com qualquer opção) em pelo menos a participação
            mínima dos conteúdos que fecharam no ciclo anterior, sem contar os próprios conteúdos.
          </li>
          <li>
            Os demais são <strong>espectadores</strong>: podem votar, e esse voto conta para medir a participação deles,
            mas não conta no resultado de nenhum conteúdo.
          </li>
          <li>
            Quem entrou no ciclo atual é espectador até o fim dele e participante garantido no ciclo seguinte. Se nenhum
            conteúdo fechou no ciclo anterior, todos são participantes.
          </li>
          <li>Num conteúdo, contam os votos de quem é participante no ciclo em que ele fecha.</li>
          <li>
            Espectadores podem enviar conteúdos, comentar e votar normalmente; só o voto não entra no resultado. Todo
            membro vê, no app, quem é participante ou espectador e quanto falta para cada um, e cada conteúdo mostra a
            quem vota se aquele voto vai contar.
          </li>
        </ul>

        <h3>5. Quórum</h3>
        <p>
          Para ser classificado, o conteúdo precisa de votos de apoio, protesto e indiferente, somados, em número igual
          ou maior que o quórum (uma porcentagem dos participantes do ciclo em que ele fecha, arredondada para cima).
          Só contam votos de participantes. Sem quórum, ele é publicado junto com a tribuna livre, com o rótulo
          &quot;sem quórum&quot;.
        </p>

        <h3>6. Classificação</h3>
        <p>
          Com o quórum atingido, a porcentagem é calculada sobre quem tomou lado: apoio ÷ (apoio + protesto), só com
          votos de participantes. Indiferente não entra nessa conta. Se o quórum foi atingido só com indiferentes, o
          apoio é 0%.
        </p>
        <ul>
          <li>
            <strong>Maioria:</strong> mais de 50% de apoio.
          </li>
          <li>
            <strong>Minoria:</strong> de 20% a 50% de apoio.
          </li>
          <li>
            <strong>Tribuna livre:</strong> menos de 20% de apoio.
          </li>
          <li>
            <strong>Sem quórum:</strong> não atingiu o quórum. Na publicação, fica no mesmo lugar da tribuna livre.
          </li>
        </ul>

        <h3>7. Ordem dentro de cada faixa</h3>
        <p>
          Primeiro quem tem mais votos de apoio. Em caso de empate, quem tem menos votos de protesto. Persistindo o empate, o conteúdo
          mais antigo.
        </p>

        <h3>8. Publicação no Instagram</h3>
        <p>
          Duas vezes por semana (quarta e domingo), saem todos os conteúdos já classificados. Quando falta uma faixa, a
          faixa de baixo sobe para o lugar dela:
        </p>
        <ul>
          <li>
            <strong>Há maioria e minoria:</strong> cada maioria vira um post. As minorias entram como imagens seguintes,
            em rodízio. A tribuna livre aparece só como texto na legenda, em rodízio.
          </li>
          <li>
            <strong>Há maioria, sem minoria:</strong> cada maioria vira um post. A tribuna livre entra como imagens
            seguintes, em rodízio.
          </li>
          <li>
            <strong>Sem maioria, há minoria:</strong> as minorias formam posts próprios, com até 10 imagens cada. A
            tribuna livre aparece só como texto na legenda.
          </li>
          <li>
            <strong>Sem maioria e sem minoria:</strong> a tribuna livre forma posts próprios, com até 10 imagens cada.
          </li>
        </ul>
        <p>
          <strong>Rodízio:</strong> o 1º da fila vai para o post da maioria mais votada, o 2º para o segundo post, e
          assim por diante. Quando os posts acabam, volta ao primeiro. Cada post tem no máximo 10 imagens.
        </p>

        <h3>9. Legenda</h3>
        <ul>
          <li>Cada post traz na legenda os textos de todos os seus conteúdos.</li>
          <li>
            Cada texto aparece com sua classificação, seu número e os totais de apoio e protesto, com o detalhamento por sentimento (só os que receberam votos). No Instagram não aparecem
            nomes nem indiferentes.
          </li>
          <li>
            O espaço é dividido por peso: maioria 4, minoria 2, tribuna livre 1. O peso segue a classificação, não a
            posição no post. Textos curtos cedem o espaço que sobra aos demais.
          </li>
          <li>Cada texto é cortado no tamanho que lhe cabe; o texto completo fica neste blog.</li>
        </ul>

        <h3>10. Blog e registro</h3>
        <p>
          Assim que a votação fecha, cada conteúdo ganha automaticamente uma página neste blog com o texto completo, o
          nome público do autor, as contagens, os votos nominais, a base do quórum, os indiferentes e os votos de
          espectadores. Depois de publicadas no Instagram, as imagens são apagadas do app; textos e votos ficam
          guardados para sempre.
        </p>

        <h3>11. Exceção legal</h3>
        <p>
          Conteúdo ilegal ou que viole as regras da plataforma não é publicado. Nesta fase, quem avalia é o idealizador
          do projeto, enquanto o conteúdo está aberto. Se a remoção acontecer depois do fechamento, o conteúdo sai do
          blog e do Instagram. Cada remoção aparece neste blog, com o motivo.
        </p>

        <h3>12. Parâmetros</h3>
        <p>
          Prazo do conteúdo, duração do ciclo, participação mínima e quórum são parâmetros públicos. Uma mudança só
          vale a partir do início do ciclo seguinte, e as versões anteriores continuam registradas, para que os
          resultados antigos nunca mudem.
        </p>
        <p className="text-sm text-muted">
          Registro: em 29/10/2026, antes do primeiro conteúdo ser enviado, os parâmetros iniciais foram ajustados de
          14 para 7 dias (prazo do conteúdo e duração do ciclo). Como nenhum conteúdo existia, nenhum resultado foi
          afetado. A partir do primeiro conteúdo, mudanças só valem no ciclo seguinte.
        </p>
        <Suspense fallback={<p className="text-sm text-muted">Carregando parâmetros…</p>}>
          <Parametros />
        </Suspense>

        <h2>C. Etapas ainda não automatizadas</h2>
        <ol>
          <li>Publicar no Instagram (o app monta os posts; a publicação ainda é manual).</li>
          <li>Avaliar conteúdo ilegal.</li>
          <li>Verificar identidade (hoje, por convite).</li>
          <li>Definir as regras (hoje, o idealizador).</li>
        </ol>

        <h2>D. Ferramentas</h2>
        <ul>
          <li>
            <strong>App Devir Social:</strong> envio, debate, votação, cálculo dos resultados, este blog e o{" "}
            <Link href="/painel">painel público</Link>.
          </li>
          <li>
            <strong>Instagram:</strong> publicação.
          </li>
        </ul>

        <h2 id="historico">E. Histórico de versões</h2>

        <h3>0.5 (30/10/2026)</h3>
        <ul>
          <li>Indiferente passou a contar para o quórum. A porcentagem de apoio continua só com apoio e protesto.</li>
          <li>Quórum atingido só com indiferentes: o conteúdo vai para a tribuna livre (0% de apoio).</li>
          <li>Na legenda do Instagram, conteúdos sem quórum ganharam rótulo e numeração próprios (SEM QUÓRUM 1, 2…).</li>
          <li>Mudança feita antes de qualquer voto ser registrado.</li>
        </ul>

        <h3>0.4 (30/10/2026)</h3>
        <ul>
          <li>
            O voto passou a ser por sentimento: quatro opções de apoio, quatro de protesto e indiferente. A
            classificação continua comparando apoio e protesto; o detalhamento por sentimento aparece neste blog e na
            legenda do Instagram.
          </li>
          <li>
            Revisão no mesmo dia: o voto atual de quem comenta passou a aparecer ao lado do nome durante o debate. As
            contagens continuam escondidas até o fechamento.
          </li>
          <li>As duas mudanças foram feitas antes de qualquer voto ser registrado.</li>
        </ul>

        <h3>0.3</h3>
        <ul>
          <li>Três opções de voto: sim, indiferente e não. Indiferente é ilustrativo e não conta.</li>
          <li>Ciclos de participação: participantes e espectadores.</li>
          <li>O quórum passou a ser calculado sobre os participantes do ciclo.</li>
          <li>Prazos e porcentagens viraram parâmetros públicos; mudanças valem a partir do ciclo seguinte.</li>
          <li>O registro de cada conteúdo passou a ser publicado automaticamente neste blog, no fechamento da votação.</li>
        </ul>

        <h3>0.1 e 0.2</h3>
        <p>
          Anteriores ao app. A versão 0.1 está{" "}
          <a href="https://devirsocial.blogspot.com/2026/10/devir-social-regras-do-piloto-versao-01.html">no blog antigo</a>.
        </p>
      </article>
    </div>
  );
}

type Versao = { inicio: string; dias_conteudo: number; dias_ciclo: number; participacao_minima: number; quorum: number };

async function Parametros() {
  const supabase = await criarClientePublico();
  const { data } = await supabase
    .from("parametros")
    .select("inicio, dias_conteudo, dias_ciclo, participacao_minima, quorum")
    .order("inicio", { ascending: false })
    .overrideTypes<Versao[], { merge: false }>();
  const agora = instanteDaRequisicao();
  return (
    <ul>
      {(data ?? []).map((v) => (
        <li key={v.inicio}>
          <strong>
            {Date.parse(v.inicio) > agora ? "Agendado a partir de" : "A partir de"} {formatarData(v.inicio)}:
          </strong>{" "}
          conteúdo aberto por {v.dias_conteudo} dias; ciclos de {v.dias_ciclo} dias; participação mínima de{" "}
          {v.participacao_minima}%; quórum de {v.quorum}% dos participantes do ciclo.
        </li>
      ))}
    </ul>
  );
}
