import { FormularioLogin } from "./formulario";

export default function Login() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <p className="text-sm text-muted">
        A participação no piloto é por convite. Informe o e-mail convidado e enviaremos um link de acesso.
      </p>
      <FormularioLogin />
    </div>
  );
}
