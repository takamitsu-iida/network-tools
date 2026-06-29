from enum import Enum
from pydantic import BaseModel
from typing import Optional


class TrafficPattern(str, Enum):
    UNIFORM = "uniform"
    BURSTY = "bursty"
    RAMP = "ramp"


class FailureType(str, Enum):
    NODE_DOWN = "node_down"
    LINK_DOWN = "link_down"


class TopologyNode(BaseModel):
    node_id: str
    label: str


class TopologyLink(BaseModel):
    src_node_id: str
    dst_node_id: str


class TrafficSimRequest(BaseModel):
    src_node_id: str
    dst_node_id: str
    traffic_pattern: TrafficPattern = TrafficPattern.UNIFORM
    bandwidth_mbps: float = 100.0
    duration_sec: int = 60
    nodes: list[TopologyNode] = []
    links: list[TopologyLink] = []


class FailureScenarioRequest(BaseModel):
    failure_type: FailureType
    target_id: str  # node_id or "src:dst" for link
    traffic_sim: TrafficSimRequest


class MetricPoint(BaseModel):
    timestamp: int         # 経過秒数
    bandwidth_mbps: float
    latency_ms: float
    packet_loss_pct: float


class PathInfo(BaseModel):
    hops: list[str] = []
    hop_labels: list[str] = []
    reachable: bool = False


class SimulationResult(BaseModel):
    sim_id: str
    status: str
    src_label: str
    dst_label: str
    metrics: list[MetricPoint] = []
    path_before: PathInfo
    path_after: Optional[PathInfo] = None
    failure_applied: bool = False
    failure_type: Optional[str] = None
    failure_target: Optional[str] = None
    summary: dict = {}
