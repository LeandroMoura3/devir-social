import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente sem login, para páginas públicas (painel e blog). Só enxerga o que as funções públicas liberam.
export async function criarClientePublico() {
  await connection();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
}
