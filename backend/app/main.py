import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db import get_pool, close_pool
from app.routes import chat, audit, dashboard

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("tokenledger.starting")
    await get_pool()
    logger.info("tokenledger.db_pool_ready")
    yield
    # Shutdown
    await close_pool()
    logger.info("tokenledger.shutdown")


app = FastAPI(
    title="TokenLedger",
    description="Real-time cost tracking and controls for AI infrastructure",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/v1")
app.include_router(audit.router, prefix="/v1")
app.include_router(dashboard.router, prefix="/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "tokenledger"}


@app.get("/ready")
async def ready():
    try:
        pool = await get_pool()
        async with pool.connection() as conn:
            await conn.execute("SELECT 1")
        return {"status": "ready", "db": "ok"}
    except Exception as e:
        return {"status": "not_ready", "db": str(e)}, 503