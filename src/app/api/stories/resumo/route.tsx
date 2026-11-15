import { ImageResponse } from "next/og";
import sharp from "sharp";

// Arte do Story "Resultado da semana" (regras v0.21), publicado pelo robô no domingo depois dos avisos.
// Só as faixas do que saiu no feed naquele domingo. Parâmetros: data e proxima (AAAA-MM-DD) e as contagens
// maioria, minoria, tribuna e semquorum. Sai em JPEG, o formato que a API do Instagram aceita.
export const maxDuration = 60;

const LOGO = "https://devir-social.vercel.app/logo.png";

const FAIXAS = [
  { chave: "maioria", cor: "#1f9a8a", nome: (n: number) => (n === 1 ? "maioria" : "maiorias") },
  { chave: "minoria", cor: "#2b6cc4", nome: (n: number) => (n === 1 ? "minoria" : "minorias") },
  { chave: "tribuna", cor: "#8a857b", nome: () => "na tribuna livre" },
  { chave: "semquorum", cor: "#8a857b", nome: () => "sem quórum" },
] as const;

function diaMes(iso: string | null): string {
  const m = iso?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[1]}` : "";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const linhas = FAIXAS.map((f) => ({ ...f, n: Math.max(0, Number(params.get(f.chave)) || 0) })).filter((f) => f.n > 0);
  const data = diaMes(params.get("data"));
  const proxima = diaMes(params.get("proxima"));

  const png = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fcf8f2",
          padding: "120px 96px 160px",
          color: "#1c1b19",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={LOGO} width={76} height={76} alt="" style={{ borderRadius: 38 }} />
          <div style={{ fontSize: 36 }}>Devir Social</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 96, letterSpacing: -2, lineHeight: 1 }}>Resultado</div>
            <div style={{ fontSize: 96, letterSpacing: -2, lineHeight: 1 }}>da semana</div>
            <div style={{ fontSize: 44, color: "#6b6760", marginTop: 12 }}>{`publicado em ${data}`}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {linhas.length === 0 ? (
              <div style={{ fontSize: 56, color: "#6b6760" }}>Nenhum post nesta semana.</div>
            ) : (
              linhas.map((l) => (
                <div key={l.chave} style={{ display: "flex", alignItems: "center", gap: 28 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: l.cor }} />
                  <div style={{ fontSize: 72, color: l.cor }}>{`${l.n} ${l.nome(l.n)}`}</div>
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: 40, color: "#4a4741" }}>
          <div>Todos os votos e o debate: link na bio</div>
          {proxima && <div>{`Próxima publicação: domingo, ${proxima}, às 18h`}</div>}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 16,
              backgroundColor: "#e3388a",
              color: "#ffffff",
              padding: "28px 44px",
              borderRadius: 48,
              fontSize: 42,
              gap: 6,
            }}
          >
            <div>Quer votar ou publicar também?</div>
            <div>link na bio → Participar</div>
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 },
  );
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
  });
}
