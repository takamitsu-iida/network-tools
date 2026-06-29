from pydantic import BaseModel
from typing import Any, Optional


class InterfaceConfig(BaseModel):
    name: str
    slot: int = 0
    ip_address: str = ""
    prefix_length: int = 24
    vlan_id: str = ""
    vrf_name: str = ""


class NodeConfigRequest(BaseModel):
    node_id: str
    label: str
    vendor: str
    os: str
    node_definition: str
    x: int = 0
    y: int = 0
    interfaces: list[InterfaceConfig] = []
    extra_params: dict[str, Any] = {}


class NodeConfigResponse(BaseModel):
    node_id: str
    label: str
    config: str


class TopologyConfigRequest(BaseModel):
    nodes: list[NodeConfigRequest] = []


class TopologyConfigResponse(BaseModel):
    configs: list[NodeConfigResponse] = []


class EdgeData(BaseModel):
    src_node_id: str
    src_iface_slot: int = 0
    dst_node_id: str
    dst_iface_slot: int = 0


class CMLPushRequest(BaseModel):
    title: str
    description: str = ""
    nodes: list[NodeConfigRequest] = []
    edges: list[EdgeData] = []
    start_after_push: bool = False


class CMLLabResponse(BaseModel):
    lab_id: str
    title: str
    state: Optional[str] = None
