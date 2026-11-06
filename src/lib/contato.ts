// Contato opcional entre membros (perfis_privados); visível só para membros e só se a pessoa permitir.
export type Contato = {
  whatsapp: string | null;
  email_contato: string | null;
  usar_email_cadastro: boolean;
  mostrar_contato: boolean;
};

export function contatoDoFormulario(formData: FormData) {
  return {
    p_whatsapp: String(formData.get("whatsapp") ?? ""),
    p_email: String(formData.get("email_contato") ?? ""),
    p_usar_email_cadastro: formData.get("usar_email_cadastro") === "on",
    p_mostrar: formData.get("mostrar_contato") === "on",
  };
}
