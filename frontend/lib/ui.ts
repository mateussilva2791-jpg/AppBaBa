export type StatusTone = "neutral" | "success" | "info" | "warning" | "danger";

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  UNAVAILABLE: "Indisponivel",
  INJURED: "Lesionado",
  SUSPENDED: "Suspenso",
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  LIVE: "Ao vivo",
  OPEN: "Aberto",
  HALF_TIME: "Intervalo",
  FINISHED: "Finalizado",
  CANCELED: "Cancelado",
  DRAFT: "Rascunho",
  READY: "Pronta",
  IN_PROGRESS: "Em andamento",
  SCHEDULED: "Agendada",
};

export function getStatusTone(status: string): StatusTone {
  switch (status) {
    case "ACTIVE":
    case "CONFIRMED":
    case "LIVE":
    case "OPEN":
    case "READY":
      return "success";
    case "PENDING":
    case "SCHEDULED":
    case "HALF_TIME":
      return "warning";
    case "IN_PROGRESS":
    case "FINISHED":
      return "info";
    case "INJURED":
    case "SUSPENDED":
    case "CANCELED":
      return "danger";
    case "UNAVAILABLE":
    case "DRAFT":
      return "neutral";
    default:
      return "neutral";
  }
}

export function formatStatusLabel(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ").toLowerCase();
}
