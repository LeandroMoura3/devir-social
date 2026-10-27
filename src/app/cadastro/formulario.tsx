"use client";

import { useActionState } from "react";
import { concluirCadastro, type EstadoCadastro } from "./acoes";

const CAIXAS = [
  { nome: "maior_idade", texto: <>Tenho 18 anos ou mais.</> },
  { nome: "regras", texto: <>Li e aceito as regras do piloto.</> },
  {
    nome: "votos_publicos",
    texto: (
      <>
        Autorizo que <strong>meus votos</strong> fiquem visíveis para os outros participantes e{" "}
        <strong>sejam publicados com meu nome público no blog</strong>, que aparece em buscadores.
      </>
    ),
  },
  {
    nome: "publicacao",
    texto: (
      <>
        Autorizo a publicação dos meus conteúdos no Instagram e no blog, conforme as regras, e que{" "}
        <strong>meu nome público apareça no blog</strong> como autor.
      </>
    ),
  },
  { nome: "responsabilidade", texto: <>Entendo que respondo legalmente pelo que envio e comento.</> },
];

export function FormularioCadastro() {
  const [estado, acao, enviando] = useActionState<EstadoCadastro, FormData>(concluirCadastro, {});

  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Nome (fica só com a coordenação)
        <input name="nome" required minLength={2} maxLength={100} autoComplete="name" className="campo" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nome público (aparece para os participantes e no blog)
        <input name="nome_publico" required minLength={2} maxLength={40} className="campo" />
        <span className="text-xs text-muted">Pode ser seu nome real, um apelido ou suas iniciais.</span>
      </label>
      <fieldset className="flex flex-col gap-2 text-sm">
        {CAIXAS.map((caixa) => (
          <label key={caixa.nome} className="flex items-start gap-2">
            <input type="checkbox" name={caixa.nome} required className="mt-1" />
            <span>{caixa.texto}</span>
          </label>
        ))}
      </fieldset>
      {estado.erro && <p className="erro">{estado.erro}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Salvando…" : "Concordo e quero participar"}
      </button>
    </form>
  );
}
