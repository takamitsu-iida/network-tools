from fastapi import APIRouter, HTTPException

from fastapi.responses import JSONResponse

from app.schemas.topology import (
    LinkCreate,
    LinkResponse,
    NodeCreate,
    NodeResponse,
    TopologyCreate,
    TopologyImport,
    TopologyResponse,
    TopologySummary,
    YamlLayoutRequest,
)
from app.services.cml_client import cml_client
from app.services.layout_generator import generate_layout_from_yaml

router = APIRouter(prefix="/topologies", tags=["topologies"])


@router.get("/", response_model=list[TopologySummary])
def list_topologies() -> list[dict]:
    try:
        return cml_client.get_all_labs()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CML connection error: {exc}") from exc


@router.post("/", response_model=TopologySummary, status_code=201)
def create_topology(data: TopologyCreate) -> dict:
    try:
        return cml_client.create_lab(title=data.title, description=data.description)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CML connection error: {exc}") from exc


# NOTE: static パスは /{lab_id} より先に宣言する
@router.post("/yaml-layout", status_code=200)
def yaml_layout(data: YamlLayoutRequest) -> JSONResponse:
    """YAMLトポロジ定義をOpenAIで推論してReactFlow形式のレイアウトを返す"""
    try:
        result = generate_layout_from_yaml(data.yaml_content)
        return JSONResponse(content=result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"レイアウト生成に失敗しました: {exc}") from exc


@router.post("/import", response_model=TopologySummary, status_code=201)
def import_topology(data: TopologyImport) -> dict:
    try:
        return cml_client.import_topology(data.yaml_content)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CML connection error: {exc}") from exc


@router.get("/{lab_id}", response_model=TopologyResponse)
def get_topology(lab_id: str) -> dict:
    try:
        return cml_client.get_lab(lab_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CML connection error: {exc}") from exc


@router.delete("/{lab_id}", status_code=204)
def delete_topology(lab_id: str) -> None:
    try:
        cml_client.delete_lab(lab_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CML connection error: {exc}") from exc


@router.post("/{lab_id}/nodes", response_model=NodeResponse, status_code=201)
def add_node(lab_id: str, data: NodeCreate) -> dict:
    try:
        return cml_client.add_node(
            lab_id=lab_id,
            label=data.label,
            node_definition=data.node_definition,
            x=data.x,
            y=data.y,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CML connection error: {exc}") from exc


@router.post("/{lab_id}/links", response_model=LinkResponse, status_code=201)
def add_link(lab_id: str, data: LinkCreate) -> dict:
    try:
        return cml_client.add_link(
            lab_id=lab_id,
            src_node_id=data.src_node_id,
            src_iface_slot=data.src_iface_slot,
            dst_node_id=data.dst_node_id,
            dst_iface_slot=data.dst_iface_slot,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CML connection error: {exc}") from exc
