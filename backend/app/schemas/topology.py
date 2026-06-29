from pydantic import BaseModel, Field
from typing import Optional


class NodeCreate(BaseModel):
    label: str
    node_definition: str
    x: int = 0
    y: int = 0


class NodeResponse(BaseModel):
    id: str
    label: str
    node_definition: str
    x: int
    y: int
    state: Optional[str] = None


class LinkCreate(BaseModel):
    src_node_id: str
    src_iface_slot: int = 0
    dst_node_id: str
    dst_iface_slot: int = 0


class LinkResponse(BaseModel):
    id: str
    src_node: str
    src_interface: str
    dst_node: str
    dst_interface: str


class TopologyCreate(BaseModel):
    title: str
    description: str = ""


class TopologyResponse(BaseModel):
    id: str
    title: str
    description: str
    state: Optional[str] = None
    nodes: list[NodeResponse] = []
    links: list[LinkResponse] = []


class TopologySummary(BaseModel):
    id: str
    title: str
    description: str
    state: Optional[str] = None
    node_count: int = 0


class TopologyImport(BaseModel):
    yaml_content: str = Field(..., description="CML topology YAML content")
