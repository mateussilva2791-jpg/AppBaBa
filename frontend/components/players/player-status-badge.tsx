import { StatusBadge } from "@/components/ui/status-badge";
import type { PlayerStatus } from "@/lib/types";
import { getStatusTone } from "@/lib/ui";


export function PlayerStatusBadge({ status }: { status: PlayerStatus }) {
  return <StatusBadge tone={getStatusTone(status)} label={status}>{status}</StatusBadge>;
}
