import { ImageResponse } from "next/og";
import sharp from "sharp";

// Arte do Story "Andamento da semana" (regras v0.22, sexta): só contagens — quantos conteúdos estão em debate e
// quantos fecham a tempo de sair no domingo. Parâmetros: abertos, domingo e proxima (AAAA-MM-DD). JPEG.
export const maxDuration = 60;

const LOGO = "https://devir-social.vercel.app/logo.png";

function diaMes(iso: string | null): string {
  const m = iso?.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[1]}` : "";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const abertos = Math.max(0, Number(params.get("abertos")) || 0);
  const domingo = Math.min(abertos, Math.max(0, Number(params.get("domingo")) || 0));
  const proxima = diaMes(params.get("proxima"));

  const principal =
    abertos === 0 ? "Nenhum conteúdo em debate agora" : `${abertos} ${abertos === 1 ? "conteúdo" : "conteúdos"} em debate`;
  const detalhe =
    abertos === 0
      ? "Que tal enviar o primeiro da semana?"
      : domingo === 0
        ? "Nenhum fecha a tempo deste domingo"
        : `${domingo} ${domingo === 1 ? "sai" : "saem"} no domingo${proxima ? `, ${proxima}` : ""}, às 18h. Vote até lá.`;

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
            <div style={{ fontSize: 96, letterSpacing: -2, lineHeight: 1 }}>Andamento</div>
            <div style={{ fontSize: 96, letterSpacing: -2, lineHeight: 1 }}>da semana</div>
          </div>
          <div style={{ display: "flex", fontSize: 76, color: "#2b6cc4", lineHeight: 1.1 }}>{principal}</div>
          <div style={{ display: "flex", fontSize: 50, color: "#4a4741", lineHeight: 1.3 }}>{detalhe}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
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
    ),
    { width: 1080, height: 1920 },
  );
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90 }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
  });
}
