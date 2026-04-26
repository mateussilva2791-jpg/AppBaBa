import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_league_role
from app.db.session import get_db
from app.models.enums import LeagueRole, PlayerStatus
from app.models.player import LeaguePlayer, LeaguePlayerStats
from app.schemas.player import PlayerCreate, PlayerRead, PlayerStatsRead, PlayerUpdate


router = APIRouter(prefix="/leagues/{league_id}/players", tags=["players"])

INACTIVE_PLAYER_STATUSES = {
    PlayerStatus.UNAVAILABLE,
    PlayerStatus.INJURED,
    PlayerStatus.SUSPENDED,
}


def derive_player_metrics(*, attack_rating: int, passing_rating: int, defense_rating: int, stamina_rating: int) -> dict[str, int]:
    return {
        "attack_rating": attack_rating,
        "passing_rating": passing_rating,
        "defense_rating": defense_rating,
        "stamina_rating": stamina_rating,
        "ovr": round((attack_rating + passing_rating + defense_rating + stamina_rating) / 4),
        "relative_speed": stamina_rating,
        "relative_strength": defense_rating,
        "skill_level": max(1, min(10, round((attack_rating + passing_rating) / 20))),
    }


def status_is_active(status: PlayerStatus) -> bool:
    return status not in INACTIVE_PLAYER_STATUSES


@router.get("", response_model=list[PlayerRead])
def list_players(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    return db.query(LeaguePlayer).filter(LeaguePlayer.league_id == league_id).order_by(LeaguePlayer.name.asc()).all()


@router.post("", response_model=PlayerRead, status_code=status.HTTP_201_CREATED)
def create_player(
    league_id: uuid.UUID,
    payload: PlayerCreate,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    existing = (
        db.query(LeaguePlayer)
        .filter(LeaguePlayer.league_id == league_id, LeaguePlayer.name == payload.name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Player with this name already exists in this league")

    player = LeaguePlayer(
        league_id=league_id,
        name=payload.name,
        nickname=payload.nickname,
        status=payload.status.value,
        is_active=status_is_active(payload.status),
        **derive_player_metrics(
            attack_rating=payload.attack_rating,
            passing_rating=payload.passing_rating,
            defense_rating=payload.defense_rating,
            stamina_rating=payload.stamina_rating,
        ),
    )
    db.add(player)
    db.flush()
    db.add(LeaguePlayerStats(league_id=league_id, player_id=player.id))
    db.commit()
    db.refresh(player)
    return player


@router.get("/stats", response_model=list[PlayerStatsRead])
def player_stats(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    return (
        db.query(LeaguePlayerStats)
        .filter(LeaguePlayerStats.league_id == league_id)
        .order_by(LeaguePlayerStats.ranking_points.desc())
        .all()
    )


@router.get("/{player_id}", response_model=PlayerRead)
def get_player(
    league_id: uuid.UUID,
    player_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    player = db.get(LeaguePlayer, player_id)
    if not player or player.league_id != league_id:
        raise HTTPException(status_code=404, detail="Player not found in this league")
    return player


@router.patch("/{player_id}", response_model=PlayerRead)
def update_player(
    league_id: uuid.UUID,
    player_id: uuid.UUID,
    payload: PlayerUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    player = db.get(LeaguePlayer, player_id)
    if not player or player.league_id != league_id:
        raise HTTPException(status_code=404, detail="Player not found in this league")

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        name_taken = (
            db.query(LeaguePlayer)
            .filter(
                LeaguePlayer.league_id == league_id,
                LeaguePlayer.name == updates["name"],
                LeaguePlayer.id != player_id,
            )
            .first()
        )
        if name_taken:
            raise HTTPException(status_code=400, detail="Player with this name already exists in this league")

    next_attack = updates.get("attack_rating", player.attack_rating)
    next_passing = updates.get("passing_rating", player.passing_rating)
    next_defense = updates.get("defense_rating", player.defense_rating)
    next_stamina = updates.get("stamina_rating", player.stamina_rating)
    next_status = PlayerStatus(updates["status"]) if "status" in updates else PlayerStatus(player.status)

    for field, value in updates.items():
        setattr(player, field, value)

    for field, value in derive_player_metrics(
        attack_rating=next_attack,
        passing_rating=next_passing,
        defense_rating=next_defense,
        stamina_rating=next_stamina,
    ).items():
        setattr(player, field, value)

    player.status = next_status.value
    player.is_active = status_is_active(next_status)

    db.add(player)
    db.commit()
    db.refresh(player)
    return player
