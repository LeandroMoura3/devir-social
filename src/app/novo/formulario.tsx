"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;

export function FormularioNovo({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar(formData: FormData) {
    setErro(undefined);
    const imagem = formData.get("imagem");
    const texto = String(formData.get("texto") ?? "").trim();
    if (!(imagem instanceof File) || imagem.size === 0) return setErro("Escolha uma imagem.");
    if (!TIPOS.includes(imagem.type)) return setErro("Use uma imagem JPG, PNG ou WebP.");
    if (imagem.size > TAMANHO_MAXIMO) return setErro("A imagem deve ter no máximo 5 MB.");
    if (!texto) return setErro("Escreva o texto do conteúdo.");

    setEnviando(true);
    const supabase = criarClienteNavegador();
    const extensao = imagem.type.split("/")[1];
    const caminho = `${usuarioId}/${crypto.randomUUID()}.${extensao}`;
    const envio = await supabase.storage.from("imagens").upload(caminho, imagem, { contentType: imagem.type });
    if (envio.error) {
      setEnviando(false);
      return setErro("Não foi possível enviar a imagem. Tente de novo.");
    }
    const { data: id, error } = await supabase.rpc("enviar_conteudo", { p_texto: texto, p_imagem_path: caminho });
    if (error) {
      await supabase.storage.from("imagens").remove([caminho]);
      setEnviando(false);
      return setErro("Não foi possível salvar o conteúdo. Tente de novo.");
    }
    router.push(`/conteudo/${id}`);
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Imagem (JPG, PNG ou WebP, até 5 MB)
        <input name="imagem" type="file" accept={TIPOS.join(",")} required className="text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Texto
        <textarea name="texto" required maxLength={5000} rows={8} className="campo" />
        <span className="text-xs text-muted">
          No Instagram, o texto pode aparecer cortado. A versão completa sempre vai para o blog.
        </span>
      </label>
      {erro && <p className="erro">{erro}</p>}
      <button className="botao" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar para debate e votação"}
      </button>
    </form>
  );
}
