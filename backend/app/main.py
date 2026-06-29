from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import topologies, templates, configs, simulations

app = FastAPI(
    title="Network Design & Simulation Tool",
    description="GUIベースのネットワーク設計・シミュレーションツール バックエンドAPI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(topologies.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(configs.router, prefix="/api/v1")
app.include_router(simulations.router, prefix="/api/v1")


@app.get("/health", tags=["health"])
def health_check() -> dict:
    return {"status": "ok"}
