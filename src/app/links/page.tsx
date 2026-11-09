import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "Links · Devir Social", description: "Você cria, o grupo vota, o perfil publica." };

// Link único da bio do Instagram. A ordem segue o que os posts e Stories pedem ("link na bio → ...").
const LINKS = [
  { href: "/blog/verificar", texto: "Verificar postagem", detalhe: "Digite o código do post e veja os votos" },
  { href: "/convite", texto: "Participar", detalhe: "Peça seu convite" },
  { href: "/blog/como-funciona", texto: "Como funciona", detalhe: "O Devir em poucos minutos" },
  { href: "/blog/regras", texto: "Regras", detalhe: "As regras completas em vigor" },
  { href: "/blog", texto: "Publicações", detalhe: "Tudo o que já foi votado" },
];

export default function Links() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-4">
      <Image src="/logo.png" alt="" width={96} height={96} priority />
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-semibold">Devir Social</h1>
        <p className="text-sm text-muted">Você cria, o grupo vota, o perfil publica. Nada é ignorado.</p>
      </div>
      <nav className="flex w-full flex-col gap-3">
        {LINKS.map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center rounded-xl px-4 py-4 text-center ${
              i === 0 ? "bg-accent text-accent-foreground" : "border border-border bg-card"
            }`}
          >
            <span className="text-base font-semibold">{l.texto}</span>
            <span className={`text-xs ${i === 0 ? "opacity-90" : "text-muted"}`}>{l.detalhe}</span>
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted">
        Já é membro?{" "}
        <Link href="/login" className="text-accent">
          Entrar
        </Link>
      </p>
    </div>
  );
}
