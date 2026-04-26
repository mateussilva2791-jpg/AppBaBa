from __future__ import annotations

import random
import uuid
from dataclasses import dataclass, field
from typing import Iterable

from app.models.enums import TeamGenerationMode
from app.models.player import LeaguePlayer


POSITION_WEIGHT = {
    "GOL": 5,
    "DEF": 4,
    "LAT": 3,
    "MEI": 4,
    "ATA": 5,
}


def compute_player_overall(player: LeaguePlayer) -> int:
    technical_core = (
        player.attack_rating * 0.31
        + player.passing_rating * 0.23
        + player.defense_rating * 0.26
        + player.stamina_rating * 0.20
    )
    level_anchor = player.skill_level * 10
    blended = technical_core * 0.68 + level_anchor * 0.32
    return round(blended)


def player_balance_score(player: LeaguePlayer) -> int:
    overall = compute_player_overall(player)
    return (
        overall * 7
        + player.skill_level * 18
        + player.attack_rating * 3
        + player.passing_rating * 2
        + player.defense_rating * 3
        + player.stamina_rating * 2
        + POSITION_WEIGHT.get((player.position or "").upper(), 0) * 5
    )


@dataclass(slots=True)
class DrawBucket:
    name: str
    color: str | None = None
    team_id: uuid.UUID | None = None
    players: list[LeaguePlayer] = field(default_factory=list)
    total_skill: int = 0
    total_overall: int = 0
    total_attack: int = 0
    total_passing: int = 0
    total_defense: int = 0
    total_stamina: int = 0

    def add_player(self, player: LeaguePlayer) -> None:
        self.players.append(player)
        self.total_skill += player_balance_score(player)
        self.total_overall += compute_player_overall(player)
        self.total_attack += player.attack_rating
        self.total_passing += player.passing_rating
        self.total_defense += player.defense_rating
        self.total_stamina += player.stamina_rating

    @property
    def average_overall(self) -> int:
        if not self.players:
            return 0
        return round(self.total_overall / len(self.players))


class TeamDrawService:
    def generate(
        self,
        *,
        players: Iterable[LeaguePlayer],
        team_count: int,
        mode: TeamGenerationMode,
        team_names: list[str] | None = None,
        team_colors: list[str | None] | None = None,
    ) -> list[DrawBucket]:
        buckets = self._build_buckets(team_count=team_count, team_names=team_names, team_colors=team_colors)
        roster = list(players)

        if mode == TeamGenerationMode.RANDOM:
            self._assign_random_players(roster, buckets)
        else:
            self._assign_balanced_players(roster, buckets)

        for bucket in buckets:
            bucket.players.sort(key=lambda player: player.name.lower())
        return buckets

    def _build_buckets(
        self,
        *,
        team_count: int,
        team_names: list[str] | None,
        team_colors: list[str | None] | None,
    ) -> list[DrawBucket]:
        buckets: list[DrawBucket] = []
        for index in range(team_count):
            buckets.append(
                DrawBucket(
                    name=team_names[index] if team_names and index < len(team_names) else f"Time {index + 1}",
                    color=team_colors[index] if team_colors and index < len(team_colors) else None,
                )
            )
        return buckets

    def _assign_balanced_players(self, players: list[LeaguePlayer], buckets: list[DrawBucket]) -> None:
        roster = sorted(
            players,
            key=lambda player: (
                player_balance_score(player),
                compute_player_overall(player),
                player.skill_level,
                player.attack_rating,
                player.defense_rating,
            ),
            reverse=True,
        )
        for player in roster:
            target_index, _ = min(
                enumerate(buckets),
                key=lambda item: (
                    len(item[1].players),
                    item[1].total_skill,
                    abs(item[1].average_overall - compute_player_overall(player)),
                    item[0],
                ),
            )
            buckets[target_index].add_player(player)

    def _assign_random_players(self, players: list[LeaguePlayer], buckets: list[DrawBucket]) -> None:
        random.shuffle(players)
        for index, player in enumerate(players):
            buckets[index % len(buckets)].add_player(player)
