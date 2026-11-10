import { Suspense } from "react";
import Link from "next/link";
import { EMAIL_CONTATO } from "@/lib/config";
import { formatarData } from "@/lib/datas";
import { lista } from "@/lib/supabase/lista";
import { criarClientePublico } from "@/lib/supabase/publico";
import { MenuBlog } from "../blog/menu";
import { FormularioConvite } from "./formulario";

export const metadata = { title: "Pedir convite · Devir Social" };

export default function Convite() {
  return (
    <div className="flex flex-col gap-6">
      <MenuBlog />
      <h1 className="text-2xl font-semibold">Pedir convite</h1>
      <div className="flex flex-col gap-3 text-sm leading-relaxed">
        <p>
          No Devir Social, os membros enviam conteúdos, debatem e votam, e o resultado decide o que vai para o
          Instagram. Antes de pedir, leia{" "}
          <Link href="/blog/como-funciona" className="underline">
            como funciona
          </Link>{" "}
          e as{" "}
          <Link href="/blog/regras" className="underline">
            regras
          </Link>
          . Os votos são nominais: quem votou em quê fica público no blog.
        </p>
        <section>
          <h2 className="font-semibold">Como é a entrada</h2>
          <ol className="list-decimal pl-5">
            <li>Você preenche o pedido abaixo.</li>
            <li>
              A coordenação te manda uma mensagem no WhatsApp citando o <strong>nome e o e-mail</strong> que você
              informou aqui (assim você sabe que é do Devir). <strong>É só responder</strong>: isso confirma que o
              número é seu. <strong>Ninguém pergunta suas opiniões.</strong>
            </li>
            <li>Aprovado o pedido, o convite chega no seu e-mail.</li>
          </ol>
          <p className="mt-2">
            Os pedidos são atendidos por ordem de chegada, até o limite de entradas do ciclo. Cada pessoa tem uma só
            conta: um WhatsApp já confirmado não pode ser usado de novo.
          </p>
          <p className="mt-2">
            <strong>Conhece alguém da coordenação?</strong> Peça o convite direto a ela, sem precisar deste formulário.
          </p>
        </section>
        <section>
          <h2 className="font-semibold">Depois de entrar: quando o seu voto conta</h2>
          <ul className="list-disc pl-5">
            <li>
              Na <strong>primeira semana</strong> você é <strong>espectador</strong>: pode enviar, comentar e votar, mas
              o voto ainda não entra no resultado.
            </li>
            <li>
              A partir da <strong>semana seguinte</strong>, você é <strong>participante</strong> e o seu voto conta.
            </li>
            <li>
              Para continuar participante, vote em pelo menos <strong>metade dos conteúdos</strong> de cada semana (com
              qualquer opção, inclusive indiferente). Quem vota menos volta a ser espectador na semana seguinte, até
              voltar a votar.
            </li>
          </ul>
          <p className="mt-2 text-muted">
            Assim, o resultado é decidido por quem acompanha o debate, e não por quem aparece só para votar uma vez.
          </p>
        </section>
        <Suspense fallback={null}>
          <Vagas />
        </Suspense>
        <section>
          <h2 className="font-semibold">O que fazemos com seus dados</h2>
          <p>
            Nome, e-mail, WhatsApp e a resposta sobre como conheceu ficam só com a coordenação, para avaliar o
            pedido. Nada disso é publicado. Trinta dias depois da decisão, esses dados são apagados do pedido. Se você
            entrar, passam a valer os termos do cadastro. Dúvidas ou pedido de exclusão antes disso:{" "}
            <a href={`mailto:${EMAIL_CONTATO}`} className="underline">
              {EMAIL_CONTATO}
            </a>
            .
          </p>
        </section>
      </div>
      <FormularioConvite />
    </div>
  );
}

type Vagas = { limite: number; usadas: number; pendentes: number; ciclo_fim: string };

async function Vagas() {
  const supabase = await criarClientePublico();
  const { data } = await lista<Vagas>(supabase.rpc("vagas_de_entrada"));
  const v = data?.[0];
  if (!v) return null;
  const livres = Math.max(0, v.limite - v.usadas);
  return (
    <p className="cartao">
      Neste ciclo (até {formatarData(new Date(Date.parse(v.ciclo_fim) - 1).toISOString())}):{" "}
      <strong>
        {livres} de {v.limite} {v.limite === 1 ? "vaga livre" : "vagas livres"}
      </strong>
      {v.pendentes > 0 && `, ${v.pendentes} ${v.pendentes === 1 ? "pedido" : "pedidos"} na fila`}. Se não houver vaga,
      o pedido espera o próximo ciclo.
    </p>
  );
}
