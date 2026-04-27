import logging
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.bootstrap import seed_subscription_plans
from app.core.config import get_settings
from app.db.session import SessionLocal, check_database_connection


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = SessionLocal()
    try:
        seed_subscription_plans(db)
    finally:
        db.close()
    yield


settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
app = FastAPI(title=settings.app_name, lifespan=lifespan)
logger = logging.getLogger("baba.api")

if settings.resolved_allowed_hosts:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.resolved_allowed_hosts)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.resolved_cors_origins,
    allow_origin_regex=None
    if settings.is_production
    else r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(api_router, prefix=settings.api_prefix)


@app.middleware("http")
async def log_http_requests(request: Request, call_next):
    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled API error method=%s path=%s", request.method, request.url.path)
        raise

    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    logger.info(
        "HTTP request completed method=%s path=%s status=%s duration_ms=%s",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        "HTTP exception method=%s path=%s status=%s detail=%s",
        request.method,
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception method=%s path=%s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


@app.get("/health")
def healthcheck():
    database_ok, database_message = check_database_connection()
    payload = {
        "status": "ok" if database_ok else "degraded",
        "service": settings.app_name,
        "environment": settings.environment,
        "api_prefix": settings.api_prefix,
        "checks": {
            "database": {
                "status": "ok" if database_ok else "error",
                "message": database_message,
            }
        },
    }
    return JSONResponse(status_code=status.HTTP_200_OK, content=payload)


@app.get("/health/live")
def liveness_check():
    return {"status": "ok", "service": settings.app_name}


@app.get("/health/ready")
def readiness_check():
    database_ok, database_message = check_database_connection()
    status_code = status.HTTP_200_OK if database_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if database_ok else "not_ready",
            "service": settings.app_name,
            "checks": {
                "database": {
                    "status": "ok" if database_ok else "error",
                    "message": database_message,
                }
            },
        },
    )


def run():
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        workers=settings.api_workers,
        proxy_headers=True,
        forwarded_allow_ips="*",
        log_level=settings.log_level,
    )


if __name__ == "__main__":
    run()
