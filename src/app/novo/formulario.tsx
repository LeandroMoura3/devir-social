"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { prepararImagem } from "@/lib/imagem";
import { criarClienteNavegador } from "@/lib/supabase/client";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const TAMANHO_MAXIMO_ORIGINAL = 25 * 1024 * 1024;

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
    if (imagem.size > TAMANHO_MAXIMO_ORIGINAL) return setErro("A imagem deve ter no máximo 25 MB.");
    if (!texto) return setErro("Escreva o texto do conteúdo.");

    setEnviando(true);
    let jpeg: Blob;
    try {
      jpeg = await prepararImagem(imagem);
    } catch {
      setEnviando(false);
      return setErro("Não foi possível ler esta imagem. Tente outra, em JPG ou PNG.");
    }
    if (jpeg.size > TAMANHO_MAXIMO) {
      setEnviando(false);
      return setErro("A imagem ficou grande demais depois de convertida. Tente outra.");
    }
    const supabase = criarClienteNavegador();
    const caminho = `${usuarioId}/${crypto.randomUUID()}.jpg`;
    const envio = await supabase.storage.from("imagens").upload(caminho, jpeg, { contentType: "image/jpeg" });
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
        Imagem (JPG, PNG ou WebP). Fotos muito altas ou muito largas são cortadas pelo centro para caber no Instagram.
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
