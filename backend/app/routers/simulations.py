from fastapi import APIRouter, HTTPException

from app.schemas.simulation import (
    FailureScenarioRequest,
    SimulationResult,
    TrafficSimRequest,
)
from app.services.simulation import simulate_failure, simulate_traffic

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.post("/traffic", response_model=SimulationResult)
def run_traffic_simulation(data: TrafficSimRequest) -> SimulationResult:
    """指定ノード間のトラフィックをシミュレーションする"""
    if len(data.nodes) < 2:
        raise HTTPException(status_code=422, detail="シミュレーションには最低2台の機器が必要です")
    if data.src_node_id == data.dst_node_id:
        raise HTTPException(status_code=422, detail="送信元と宛先が同じです")
    try:
        return simulate_traffic(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/failure", response_model=SimulationResult)
def run_failure_simulation(data: FailureScenarioRequest) -> SimulationResult:
    """障害シナリオを注入してトラフィックへの影響をシミュレーションする"""
    if len(data.traffic_sim.nodes) < 2:
        raise HTTPException(status_code=422, detail="シミュレーションには最低2台の機器が必要です")
    try:
        return simulate_failure(data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
