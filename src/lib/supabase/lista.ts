// Funções RPC sem tipos gerados são tratadas como objeto único; aqui declaramos que retornam listas.
export async function lista<T>(
  consulta: PromiseLike<{ data: unknown; error: unknown }>,
): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await consulta;
  return { data: data as T[] | null, error };
}
