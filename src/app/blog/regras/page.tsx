import { Suspense } from "react";
import Link from "next/link";
import { formatarData, instanteDaRequisicao } from "@/lib/datas";
import { ultimoDiaDoCiclo } from "@/lib/participacao";
import { lista } from "@/lib/supabase/lista";
import { criarClientePublico } from "@/lib/supabase/publico";
import { MenuBlog } from "../menu";

export const metadata = { title: "Regras do piloto · Devir Social" };

export default function Regras() {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <article className="prosa">
        <h1 className="text-2xl font-semibold">Regras do piloto (versão 0.10)</h1>
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
        <p>
          Cada membro pode, se quiser, informar WhatsApp e e-mail de contato e permitir que apareçam para os outros
          membros, na página Membros do app, para que possam se articular. O contato nunca aparece neste blog nem no
          Instagram.
        </p>

        <h3>2. Envio</h3>
        <p>Um conteúdo é uma imagem mais um texto. Cada conteúdo recebe um número (#).</p>
        <p>
          <strong>Cota de envios:</strong> cada membro pode enviar até um número de conteúdos por ciclo, igual para
          todos. A cota se ajusta sozinha pelo volume do ciclo anterior (todos os conteúdos enviados, inclusive
          cancelados e removidos), para que haja sempre uma quantidade boa de conteúdos para votar:
        </p>
        <ul>
          <li>volume acima do alvo: a cota cai 1;</li>
          <li>volume abaixo da metade do alvo: a cota sobe 1;</li>
          <li>entre os dois: a cota se mantém.</li>
        </ul>
        <p>
          A cota fica sempre entre 1 e 5 e começou em 3 no primeiro ciclo do piloto. O alvo é um parâmetro público (item
          13). Quem já usou a cota pode pedir a outro membro que envie por ela; quem envia aparece como autor e responde
          pelo conteúdo.
        </p>
        <Suspense fallback={<p className="text-sm text-muted">Carregando cotas…</p>}>
          <Cotas />
        </Suspense>

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
          <li>Conteúdos cancelados pelo autor ou removidos pela coordenação não entram na conta de participação.</li>
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
          Uma vez por semana, no domingo, às 18h (horário de Brasília), o app publica sozinho todos os conteúdos já classificados. Quando falta uma faixa, a
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
          Assim que a votação fecha, cada conteúdo ganha automaticamente uma página neste blog com a imagem, o texto
          completo, o nome público do autor, as contagens, os votos nominais, a base do quórum, os indiferentes e os
          votos de espectadores. A página principal do blog agrupa os conteúdos por postagem de domingo: maioria e
          minoria aparecem direto, e a tribuna livre a um clique. Imagens, textos e votos ficam guardados para sempre.
          Conteúdos cancelados ou removidos não têm imagem pública.
        </p>

        <h3>11. Exceção legal</h3>
        <p>
          Conteúdo ilegal ou que viole as regras da plataforma não é publicado. Nesta fase, quem avalia é o idealizador
          do projeto, enquanto o conteúdo está aberto. Se a remoção acontecer depois do fechamento, o conteúdo sai do
          blog e do Instagram. Cada remoção aparece neste blog, com o motivo.
        </p>

        <h3>12. Cancelamento pelo autor</h3>
        <ul>
          <li>
            Enquanto o conteúdo está aberto, o autor pode cancelá-lo, por exemplo se mudou de ideia durante o debate.
            O motivo é opcional. Não dá para desfazer.
          </li>
          <li>
            O conteúdo cancelado não é classificado e não vai para o Instagram. A votação e o debate fecham na hora; os
            comentários continuam visíveis no app.
          </li>
          <li>
            Este blog registra o cancelamento numa página própria, no mesmo formato dos publicados: texto completo, nome
            público do autor, datas, motivo (se houver) e os votos nominais dados até o cancelamento. Como o conteúdo
            não chega a fechar, participantes e espectadores são os do ciclo em que o cancelamento aconteceu.
          </li>
        </ul>

        <h3>13. Parâmetros</h3>
        <p>
          Prazo do conteúdo, duração do ciclo, participação mínima, quórum e alvo de conteúdos por ciclo são
          parâmetros públicos. Uma mudança só
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

        <h3>0.10 (07/11/2026)</h3>
        <ul>
          <li>
            As imagens passaram a ficar guardadas para sempre e a aparecer neste blog, inclusive as da tribuna livre,
            que antes não chegavam a ser vistas fora do app (item 10).
          </li>
          <li>O blog passou a agrupar os conteúdos por postagem de domingo, com a tribuna livre a um clique.</li>
          <li>Mudança feita antes de qualquer imagem ter sido apagada; os membros atuais confirmam a leitura no app.</li>
        </ul>

        <h3>0.9 (06/11/2026)</h3>
        <ul>
          <li>
            A publicação no Instagram passou a ser automática: aos domingos, às 18h, o app monta e publica os posts
            pelas regras (item 8). Saiu da lista de etapas ainda não automatizadas.
          </li>
        </ul>

        <h3>0.8 (06/11/2026)</h3>
        <ul>
          <li>Publicação no Instagram passa a ser uma vez por semana, no domingo (item 8).</li>
          <li>
            Cancelados ganham página própria no blog, com os votos nominais, no mesmo formato dos publicados (item 12).
          </li>
        </ul>

        <h3>0.7 (06/11/2026)</h3>
        <ul>
          <li>
            Cota de envios por ciclo, igual para todos e ajustada pelo volume do ciclo anterior (item 2), com alvo de 20
            conteúdos por ciclo. Vale desde o ciclo atual: com o volume do ciclo anterior, a cota deste ciclo é 4.
          </li>
          <li>Contato opcional (WhatsApp e e-mail) visível só para membros, e só para quem permitir (item 1).</li>
        </ul>

        <h3>0.6 (05/11/2026)</h3>
        <ul>
          <li>
            O autor pode cancelar o próprio conteúdo enquanto ele está aberto (item 12). O cancelamento fica registrado
            neste blog, com o texto completo e os votos até aquele momento.
          </li>
        </ul>

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

        <h3>0.2</h3>
        <p>
          Preparada em 27/10/2026 para substituir a 0.1 (voto nominal, só imagens, quórum, app próprio no lugar do
          Telegram), mas não chegou a ser publicada nem entrou em vigor: o app estreou já com a 0.3, que incorporou essas
          mudanças.
        </p>

        <h3>0.1</h3>
        <p>Primeira versão, anterior ao app: envio e votação pelo Telegram. Texto original abaixo.</p>
        <details>
          <summary className="cursor-pointer">Ver o texto da versão 0.1 (histórico, não está em vigor)</summary>
          <div className="mt-3 border-l border-border pl-4">
            <h4 className="font-semibold">Devir Social: regras do piloto (versão 0.1)</h4>

            <h4 className="font-semibold">A. Regras que não mudam</h4>
            <p>Qualquer instância que mantiver estas três regras pode usar o nome Devir:</p>
            <ol>
              <li>
                Processo determinístico e verificável: regras e entradas são públicas, e qualquer pessoa pode recalcular o
                resultado. Toda decisão humana é registrada como uma etapa ainda não automatizada.
              </li>
              <li>Peso igual: nenhum voto vale mais que outro.</li>
              <li>
                Todo conteúdo é publicado, com visibilidade proporcional ao apoio. Cada autor responde pelo que diz.
                Exceções só por obrigação legal, sempre registradas.
              </li>
            </ol>

            <h4 className="font-semibold">B. Funcionamento do piloto</h4>
            <p>
              <strong>1. Envio.</strong> Um conteúdo é uma imagem ou um vídeo, mais um texto. Cada conteúdo recebe um
              número (#).
            </p>
            <p>
              <strong>2. Votação.</strong> Secreta, aberta por 7 dias. Opções: a favor ou contra.
            </p>
            <p>
              <strong>3. Classificação.</strong>
            </p>
            <ul>
              <li>Maioria: mais de 50% a favor.</li>
              <li>Minoria: de 20% a 50% a favor.</li>
              <li>Tribuna livre: menos de 20% a favor.</li>
            </ul>
            <p>
              <strong>4. Ordem dentro de cada faixa.</strong> Primeiro quem tem mais votos a favor. Em caso de empate,
              quem tem menos votos contra. Persistindo o empate, o conteúdo mais antigo.
            </p>
            <p>
              <strong>5. Publicação.</strong> Duas vezes por semana (quarta e domingo), saem todos os conteúdos cuja
              votação terminou. Quando falta uma faixa, a faixa de baixo sobe para o lugar dela:
            </p>
            <ul>
              <li>
                Há maioria e minoria: cada maioria vira um post. As minorias entram como imagens seguintes, em rodízio. A
                tribuna livre aparece só como texto na legenda, em rodízio.
              </li>
              <li>
                Há maioria, sem minoria: cada maioria vira um post. A tribuna livre entra como imagens seguintes, em
                rodízio.
              </li>
              <li>
                Sem maioria, há minoria: um único post com todas as minorias. A tribuna livre aparece só como texto na
                legenda.
              </li>
              <li>Sem maioria e sem minoria: um único post com a tribuna livre.</li>
            </ul>
            <p>
              Rodízio: o 1º da fila vai para o post da maioria mais votada, o 2º para o segundo post, e assim por diante.
              Quando os posts acabam, volta ao primeiro.
            </p>
            <p>
              <strong>6. Legenda.</strong>
            </p>
            <ul>
              <li>Cada post traz na legenda os textos de todos os seus conteúdos.</li>
              <li>Cada texto aparece com sua classificação, seu número e os votos a favor, contra e total.</li>
              <li>
                O espaço é dividido por peso: maioria 4, minoria 2, tribuna livre 1. O peso segue a classificação, não a
                posição no post.
              </li>
              <li>Cada texto é cortado no tamanho que lhe cabe.</li>
            </ul>
            <p>
              <strong>7. Blog.</strong> Cada publicação tem uma página neste blog, com o texto completo e a contagem de
              votos de todos os conteúdos. O link fica na bio do Instagram.
            </p>
            <p>
              <strong>8. Exceção legal.</strong> Conteúdo ilegal ou que viole as regras da plataforma não é publicado.
              Cada remoção é registrada neste blog, com o motivo.
            </p>

            <h4 className="font-semibold">C. Etapas ainda não automatizadas</h4>
            <p>Cada item sai desta lista quando for automatizado:</p>
            <ol>
              <li>Numerar os conteúdos e criar as enquetes.</li>
              <li>Encerrar as votações e anotar as contagens.</li>
              <li>Montar os posts (cascata, rodízio, corte dos textos).</li>
              <li>Avaliar conteúdo ilegal.</li>
              <li>Verificar identidade (hoje, por convite).</li>
              <li>Votação: secreta para o grupo, mas não verificável. O Telegram tem acesso aos votos.</li>
              <li>Definir as regras (hoje, o idealizador).</li>
            </ol>

            <h4 className="font-semibold">D. Ferramentas do piloto</h4>
            <ul>
              <li>Telegram: envio e votação.</li>
              <li>Instagram: publicação.</li>
              <li>Blog: registro completo.</li>
            </ul>
          </div>
        </details>
      </article>
    </div>
  );
}

type Versao = {
  inicio: string;
  dias_conteudo: number;
  dias_ciclo: number;
  participacao_minima: number;
  quorum: number;
  alvo_conteudos: number;
};

async function Parametros() {
  const supabase = await criarClientePublico();
  const { data } = await supabase
    .from("parametros")
    .select("inicio, dias_conteudo, dias_ciclo, participacao_minima, quorum, alvo_conteudos")
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
          {v.participacao_minima}%; quórum de {v.quorum}% dos participantes do ciclo; alvo de {v.alvo_conteudos}{" "}
          conteúdos por ciclo.
        </li>
      ))}
    </ul>
  );
}

type Cota = { ciclo_inicio: string; ciclo_fim: string; cota: number; volume: number; alvo: number };

// Histórico público da cota: qualquer pessoa recalcula a partir do volume de cada ciclo.
async function Cotas() {
  const supabase = await criarClientePublico();
  const { data } = await lista<Cota>(supabase.rpc("cotas_por_ciclo"));
  const ciclos = [...(data ?? [])].reverse();
  return (
    <ul>
      {ciclos.map((c, i) => (
        <li key={c.ciclo_inicio}>
          <strong>
            {formatarData(c.ciclo_inicio)} a {ultimoDiaDoCiclo(c.ciclo_fim)}:
          </strong>{" "}
          cota de {c.cota} por membro; {c.volume} {c.volume === 1 ? "conteúdo enviado" : "conteúdos enviados"}
          {i === 0 ? " até agora" : ""} (alvo {c.alvo}).
        </li>
      ))}
    </ul>
  );
}
