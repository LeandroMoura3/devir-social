import Link from "next/link";
import { MenuBlog } from "../menu";

export const metadata = { title: "Por que o Devir Social?" };

export default function PorQue() {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <article className="prosa">
        <h1 className="text-2xl font-semibold">Por que o Devir Social?</h1>
        <p>
          <em>
            Devir é uma das ideias mais antigas da filosofia: tudo está em transformação. O Devir Social parte daí. A
            comunicação pública também pode ser transformada, coletivamente e com regras que todos podem ver.
          </em>
        </p>

        <h2>O problema</h2>
        <p>
          Hoje, boa parte do que vemos e lemos é escolhida por algoritmos que ninguém de fora conhece. Eles mudam sem
          aviso e premiam o que gera mais reação, não necessariamente o que uma comunidade considera importante. Quem tem
          mais seguidores, ou mais dinheiro para impulsionar, fala mais alto.
        </p>

        <h2>Nossa proposta</h2>
        <p>
          O Devir Social é uma forma de construir comunicação coletivamente. Os participantes enviam conteúdos, votam
          nos conteúdos uns dos outros, e o resultado é publicado seguindo regras públicas. Não há curadoria escondida:
          com as mesmas regras e os mesmos votos, o resultado é sempre o mesmo, e qualquer pessoa pode conferir.
        </p>

        <h2>Nossos princípios</h2>
        <ul>
          <li>
            <strong>Regras públicas e determinísticas.</strong> Tudo segue regras claras e abertas. Como este é um
            projeto piloto, algumas etapas ainda são feitas à mão, mas cada uma delas é registrada. O objetivo é que,
            aos poucos, tudo seja automatizado.
          </li>
          <li>
            <strong>Peso igual para todos.</strong> Nenhum voto vale mais que outro. Isso também significa que cada
            participante é responsável, inclusive legalmente, pelo que publica.
          </li>
          <li>
            <strong>Democracia, não ditadura da maioria.</strong> A maioria ganha destaque, mas a minoria também é
            publicada, na proporção do apoio que recebeu. Todos têm o mesmo direito de propor, votar e ter sua proposta
            votada.
          </li>
          <li>
            <strong>Complemento ao Estado, não substituto.</strong> O projeto é político, mas não pretende substituir as
            instituições públicas. Ele quer ajudar a criar pontes entre pessoas que pensam diferente, por meio de regras
            definidas e transparentes. Todos os participantes são voluntários.
          </li>
          <li>
            <strong>Proteção contra abuso.</strong> Vamos ajustar as regras sempre que for preciso para que a
            ferramenta não seja explorada nem banalizada, e para que o que for publicado tenha alcance real.
          </li>
        </ul>

        <h2>Um projeto aberto</h2>
        <p>
          Nesta fase, as regras são definidas pelo idealizador do projeto. A intenção é que, com o uso e com o tempo, o
          Devir Social ganhe história própria e se torne autônomo. Como o algoritmo é público, qualquer pessoa pode
          estudá-lo, sugerir mudanças ou criar a sua própria versão. O código está aberto em{" "}
          <a href="https://github.com/LeandroMoura3/devir-social">github.com/LeandroMoura3/devir-social</a>.
        </p>

        <h2>Para onde vamos</h2>
        <p>
          Hoje somos um piloto pequeno. No futuro, o Devir poderá existir em qualquer escala, de uma comunidade a um
          país, sempre com as mesmas regras básicas: processo verificável, peso igual e nenhuma voz deixada de fora.
        </p>

        <h2>Participe</h2>
        <p>
          A participação no piloto é por convite. Para entender como funciona, leia{" "}
          <Link href="/blog/como-funciona">como funciona</Link> e as <Link href="/blog/regras">regras completas</Link>.
        </p>
      </article>
    </div>
  );
}
