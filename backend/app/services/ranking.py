from sqlalchemy.orm import Session

from app.models.player import LeaguePlayerStats


def recalculate_ranking(db: Session, league_id):
    stats = (
        db.query(LeaguePlayerStats)
        .filter(LeaguePlayerStats.league_id == league_id)
        .order_by(LeaguePlayerStats.wins.desc(), LeaguePlayerStats.goals.desc())
        .all()
    )
    for item in stats:
        item.ranking_points = (
            item.wins * 5
            + item.goals * 3
            + item.assists * 2
            + item.clean_sheets * 2
            + item.attendances
            - item.yellow_cards
            - (item.red_cards * 2)
        )
    db.flush()
    return stats
