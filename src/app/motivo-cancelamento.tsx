// Motivo do cancelamento pelo autor, em destaque (app e blog).
export function MotivoCancelamento({ motivo }: { motivo: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-l-4 border-border border-l-accent bg-card px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Motivo do cancelamento</p>
      <p className={motivo ? "text-base font-medium" : "text-sm text-muted"}>
        {motivo ? `“${motivo}”` : "O autor não informou o motivo."}
      </p>
    </div>
  );
}
