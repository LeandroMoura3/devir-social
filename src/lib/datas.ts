const FUSO = "America/Sao_Paulo";

const formatoData = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatarData(iso: string): string {
  return formatoData.format(new Date(iso));
}

export function formatarDataHora(iso: string): string {
  return formatoDataHora.format(new Date(iso));
}

const formatoPartes = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

const DIAS_SEMANA = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Domingo (AAAA-MM-DD) da semana atual em Brasília; mesma regra de public.semana_de no banco.
export function semanaAtual(agora = new Date()): string {
  const partes = Object.fromEntries(formatoPartes.formatToParts(agora).map((p) => [p.type, p.value]));
  const hoje = Date.UTC(Number(partes.year), Number(partes.month) - 1, Number(partes.day));
  const domingo = new Date(hoje - DIAS_SEMANA.indexOf(partes.weekday) * 86_400_000);
  return domingo.toISOString().slice(0, 10);
}

export function tempoRestante(fechaEm: string, agora: number): string {
  const ms = Date.parse(fechaEm) - agora;
  if (ms <= 0) return "fechado";
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 24) return `fecha em ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `fecha em ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

// Server Components renderizam uma vez por requisição; o instante da requisição define o que está aberto.
export function instanteDaRequisicao(): number {
  return Date.now();
}
