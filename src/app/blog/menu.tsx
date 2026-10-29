import Link from "next/link";

const ITENS = [
  { href: "/blog", texto: "Publicações" },
  { href: "/blog/por-que", texto: "Por que" },
  { href: "/blog/como-funciona", texto: "Como funciona" },
  { href: "/blog/regras", texto: "Regras" },
  { href: "/painel", texto: "Painel" },
];

export function MenuBlog() {
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border pb-3 text-sm text-muted">
      {ITENS.map((item) => (
        <Link key={item.href} href={item.href} className="hover:text-foreground">
          {item.texto}
        </Link>
      ))}
    </nav>
  );
}
