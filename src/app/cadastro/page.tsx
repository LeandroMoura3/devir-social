import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EMAIL_CONTATO, URL_POR_QUE, URL_REGRAS } from "@/lib/config";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioCadastro } from "./formulario";

export default function Cadastro() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Bem-vindo ao Devir Social</h1>
      <TextoConsentimento />
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <ExigirLogin />
      </Suspense>
    </div>
  );
}

async function ExigirLogin() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return <FormularioCadastro />;
}

function TextoConsentimento() {
  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed">
      <p>
        O Devir Social é um projeto piloto de comunicação coletiva. Antes de participar, leia com atenção como seus
        dados e sua participação serão usados.
      </p>

      <section>
        <h2 className="font-semibold">O que você pode fazer aqui</h2>
        <p>
          Enviar conteúdos (imagem e texto), comentar, debater e votar nos conteúdos de outros
          participantes, escolhendo um sentimento de apoio, de protesto ou indiferente.
        </p>
        <p className="mt-2">
          Para o seu voto contar, é preciso participar com regularidade: o tempo é dividido em ciclos, e quem votou em
          pelo menos uma parte mínima dos conteúdos do ciclo anterior é <strong>participante</strong>. Quem votou menos
          é <strong>espectador</strong>: pode votar, mas o voto não conta no resultado. Quem acabou de entrar é
          espectador até o fim do ciclo atual e participante garantido no seguinte. Os prazos e porcentagens estão no
          painel público.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">O que fica visível para os outros participantes</h2>
        <p>
          Seu <strong>nome público</strong>, que você escolhe abaixo (pode ser seu nome real, um apelido ou suas
          iniciais), seus conteúdos, seus comentários e <strong>os seus votos</strong> (o sentimento que cada um
          escolheu em cada conteúdo: durante o debate, ao lado dos seus comentários; de todos, depois que a votação
          fecha).
        </p>
      </section>

      <section>
        <h2 className="font-semibold">O que fica visível para o público (Instagram e blog)</h2>
        <ul className="list-disc pl-5">
          <li>
            <strong>No Instagram:</strong> os conteúdos, a classificação de cada um e os totais de apoio e protesto, com o detalhamento por sentimento.
            Seu nome não aparece.
          </li>
          <li>
            <strong>No blog:</strong> o mesmo, mais o texto completo e <strong>o seu nome público como autor</strong>{" "}
            dos conteúdos que você enviou. O blog é público e aparece em buscadores como o Google.
          </li>
          <li>
            <strong>No blog também aparece a lista de quem votou em cada sentimento</strong> de cada conteúdo, com o seu nome
            público. Não existe voto privado: cada participante assume publicamente o seu voto.
          </li>
          <li>
            Seu nome real e seu e-mail ficam só com a coordenação do projeto, para garantir que cada participante
            responda pelo que faz.
          </li>
          <li>
            Seus comentários <strong>não</strong> são publicados fora do app.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">O que guardamos e por quanto tempo</h2>
        <ul className="list-disc pl-5">
          <li>Imagens: até serem publicadas no Instagram, depois são apagadas do app.</li>
          <li>
            Textos, comentários, votos e contagens: para sempre, para que qualquer pessoa possa conferir os resultados.
          </li>
          <li>
            Se você excluir sua conta, seu nome é substituído por &quot;participante removido&quot;. Seus votos e
            conteúdos continuam contando nos resultados já registrados.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Sua responsabilidade</h2>
        <p>
          Você responde, inclusive legalmente, pelo que envia e comenta. Conteúdo ilegal ou que viole as regras das
          plataformas não é publicado, e cada remoção é registrada publicamente, com o motivo.
        </p>
      </section>

      <section>
        <h2 className="font-semibold">Seus direitos</h2>
        <p>
          Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail{" "}
          <a className="underline" href={`mailto:${EMAIL_CONTATO}`}>
            {EMAIL_CONTATO}
          </a>
          .
        </p>
      </section>

      <p>
        Leia também:{" "}
        <a className="underline" href={URL_POR_QUE} target="_blank" rel="noreferrer">
          Por que o Devir Social?
        </a>{" "}
        ·{" "}
        <a className="underline" href={URL_REGRAS} target="_blank" rel="noreferrer">
          Regras do piloto
        </a>
      </p>
    </div>
  );
}
