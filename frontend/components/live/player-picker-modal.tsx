"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getEventLabel } from "@/lib/live";
import type { LiveTeam, MatchEventDetail, MatchEventType } from "@/lib/types";


type EventDraft = {
  event_type: MatchEventType;
  team_id: string | null;
  player_id: string | null;
  related_player_id: string | null;
  minute: number;
  second: number;
  notes: string | null;
};

type PlayerPickerModalProps = {
  open: boolean;
  teams: LiveTeam[];
  initialDraft: EventDraft | null;
  editingEvent?: MatchEventDetail | null;
  onClose: () => void;
  onSubmit: (draft: EventDraft) => void;
};

const TEAM_REQUIRED = new Set(["GOAL", "FOUL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION", "ASSIST"]);
const PLAYER_REQUIRED = new Set(["GOAL", "FOUL", "YELLOW_CARD", "RED_CARD", "SUBSTITUTION", "ASSIST"]);

export function PlayerPickerModal({ open, teams, initialDraft, editingEvent, onClose, onSubmit }: PlayerPickerModalProps) {
  const [draft, setDraft] = useState<EventDraft | null>(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const selectedTeamPlayers = useMemo(() => {
    if (!draft?.team_id) {
      return [];
    }
    return teams.find((team) => team.id === draft.team_id)?.players ?? [];
  }, [draft?.team_id, teams]);

  if (!open || !draft) {
    return null;
  }

  const needsTeam = TEAM_REQUIRED.has(draft.event_type);
  const needsPlayer = PLAYER_REQUIRED.has(draft.event_type);
  const isGoal = draft.event_type === "GOAL";
  const isSub = draft.event_type === "SUBSTITUTION";

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(4,10,20,0.82)] px-4 py-6 backdrop-blur-md" onClick={onClose}>
      <div className="mx-auto max-w-2xl page-card" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{editingEvent ? "Editar evento" : "Novo evento"}</p>
            <h2 className="section-title mt-2">{getEventLabel(draft.event_type)}</h2>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input-shell w-full" type="number" min="0" value={draft.minute} onChange={(event) => setDraft({ ...draft, minute: Number(event.target.value) })} placeholder="Minuto" />
            <input className="input-shell w-full" type="number" min="0" max="59" value={draft.second} onChange={(event) => setDraft({ ...draft, second: Number(event.target.value) })} placeholder="Segundo" />
          </div>

          {needsTeam ? (
            <select
              className="input-shell w-full"
              value={draft.team_id ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  team_id: event.target.value || null,
                  player_id: null,
                  related_player_id: null,
                })
              }
            >
              <option value="">Selecione o time</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          ) : null}

          {needsPlayer ? (
            <select className="input-shell w-full" value={draft.player_id ?? ""} onChange={(event) => setDraft({ ...draft, player_id: event.target.value || null })}>
              <option value="">{isSub ? "Quem sai" : "Selecione o jogador"}</option>
              {selectedTeamPlayers.map((player) => (
                <option key={player.player_id} value={player.player_id}>{player.player_name}</option>
              ))}
            </select>
          ) : null}

          {isGoal || isSub ? (
            <select className="input-shell w-full" value={draft.related_player_id ?? ""} onChange={(event) => setDraft({ ...draft, related_player_id: event.target.value || null })}>
              <option value="">{isGoal ? "Assistencia opcional" : "Quem entra"}</option>
              {selectedTeamPlayers
                .filter((player) => player.player_id !== draft.player_id)
                .map((player) => (
                  <option key={player.player_id} value={player.player_id}>{player.player_name}</option>
                ))}
            </select>
          ) : null}

          <input className="input-shell w-full" type="text" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value || null })} placeholder="Observacao opcional" />

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={() => onSubmit(draft)}>Confirmar</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
