from fastapi import APIRouter

from app.api.routes import auth, billing, dev, history, leagues, matches, players, ranking, reports, sessions


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dev.router)
api_router.include_router(leagues.router)
api_router.include_router(players.router)
api_router.include_router(sessions.router)
api_router.include_router(matches.router)
api_router.include_router(ranking.router)
api_router.include_router(history.router)
api_router.include_router(reports.router)
api_router.include_router(billing.router)
