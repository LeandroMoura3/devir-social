import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sair } from "./acoes";

// Menu do topo: membros veem o app; visitantes (vindos do Instagram ou do blog) veem só o que é público.
export async function MenuTopo() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return <MenuVisitante />;
  return (
    <>
      <Link href="/" className="mr-auto font-semibold">
        Devir Social
      </Link>
      <Link href="/">Início</Link>
      <Link href="/membros">Membros</Link>
      <Link href="/blog">Blog</Link>
      <Link href="/painel">Painel</Link>
      <Link href="/perfil">Perfil</Link>
      <form action={sair}>
        <button className="text-muted">Sair</button>
      </form>
    </>
  );
}

export function MenuVisitante() {
  return (
    <>
      <Link href="/links" className="mr-auto font-semibold">
        Devir Social
      </Link>
      <Link href="/blog">Blog</Link>
      <Link href="/convite">Participar</Link>
      <Link href="/login" className="text-muted">
        Entrar
      </Link>
    </>
  );
}
