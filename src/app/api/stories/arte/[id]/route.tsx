import { ImageResponse } from "next/og";
import sharp from "sharp";
import { carregarPublicados, linksDasImagens } from "@/lib/blog";
import { NOME_FAIXA } from "@/lib/regras";

// Arte vertical (1080×1920) de um Story: a imagem do post centralizada, a faixa e o número.
//   ?tipo=aviso         → "Post novo" (domingo, logo depois do feed)
//   ?tipo=republicacao  → "De volta" (quarta, pelo rodízio)
// Só posts já publicados no Instagram. Sai em JPEG, o formato que a API do Instagram aceita.
export const maxDuration = 60;

// Endereço público (o gerador de imagem bloqueia endereços locais, inclusive em desenvolvimento).
const LOGO = "https://devir-social.vercel.app/logo.png";

const CORES: Record<string, string> = {
  maioria: "#1f9a8a",
  minoria: "#2b6cc4",
  tribuna_livre: "#6b6760",
  sem_quorum: "#6b6760",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const tipo = new URL(request.url).searchParams.get("tipo") === "republicacao" ? "republicacao" : "aviso";
  const post = (await carregarPublicados()).find((p) => p.id === id && p.instagramEm);
  if (!post?.imagemPath) return new Response("Post não encontrado ou sem imagem.", { status: 404 });
  const imagem = (await linksDasImagens([post.imagemPath])).get(post.imagemPath);
  if (!imagem) return new Response("Imagem indisponível.", { status: 404 });

  const cor = CORES[post.faixa];
  const png = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "#fcf8f2",
          padding: "120px 80px 140px",
          color: "#1c1b19",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 20 }}>
          <img src={LOGO} width={76} height={76} alt="" style={{ borderRadius: 38 }} />
          <div style={{ fontSize: 36, fontWeight: 700 }}>Devir Social</div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 30,
              fontWeight: 700,
              color: "#ffffff",
              backgroundColor: cor,
              padding: "12px 28px",
              borderRadius: 999,
            }}
          >
            {tipo === "aviso" ? "POST NOVO" : "DE VOLTA"}
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 70, fontSize: 64, fontWeight: 800, color: cor }}>
          {`#${post.id} - ${NOME_FAIXA[post.faixa].toUpperCase()}`}
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", width: "100%" }}>
          <img
            src={imagem}
            alt=""
            width={920}
            height={1150}
            style={{ objectFit: "contain", borderRadius: 24 }}
          />
        </div>
        <div style={{ display: "flex", fontSize: 38, color: "#4a4741", textAlign: "center" }}>
          {`Votos e debate: link na bio → Verificar postagem → código ${post.id}`}
        </div>
        {/* Quarta (post de volta): a chamada para participar vai na própria moldura (regras v0.22). */}
        {tipo === "republicacao" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 32,
              backgroundColor: "#e3388a",
              color: "#ffffff",
              padding: "24px 40px",
              borderRadius: 48,
              fontSize: 38,
              gap: 4,
            }}
          >
            <div>Quer votar ou publicar também?</div>
            <div>link na bio → Participar</div>
          </div>
        )}
      </div>
    ),
    { width: 1080, height: 1920 },
  );
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
  });
}
