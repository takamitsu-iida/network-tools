import time

import yaml
from fastapi import APIRouter, HTTPException

from app.schemas.config import (
    CMLLabResponse,
    CMLPushRequest,
    NodeConfigResponse,
    TopologyConfigRequest,
    TopologyConfigResponse,
)
from app.services.cml_client import cml_client
from app.services.config_generator import config_generator

router = APIRouter(prefix="/configs", tags=["configs"])


@router.post("/preview", response_model=TopologyConfigResponse)
def preview_configs(data: TopologyConfigRequest) -> TopologyConfigResponse:
    """各ノードの Config をプレビュー生成して返す（CML への送信なし）"""
    configs: list[NodeConfigResponse] = []
    for node in data.nodes:
        try:
            config_text = config_generator.generate(node)
        except FileNotFoundError:
            config_text = f"# No template found for {node.vendor}/{node.os}\n"
        except Exception as exc:
            config_text = f"# Config generation error: {exc}\n"
        configs.append(
            NodeConfigResponse(node_id=node.node_id, label=node.label, config=config_text)
        )
    return TopologyConfigResponse(configs=configs)


@router.post("/push-to-cml", response_model=CMLLabResponse)
def push_to_cml(data: CMLPushRequest) -> CMLLabResponse:
    """Config を生成し CML へトポロジをインポートする"""
    # 1. 各ノードの Config を生成
    node_configs: dict[str, str] = {}
    for node in data.nodes:
        try:
            node_configs[node.node_id] = config_generator.generate(node)
        except Exception:
            node_configs[node.node_id] = ""

    # 2. React Flow ID → CML node ID のマッピングを作成
    node_id_map: dict[str, str] = {}
    cml_nodes = []
    for i, node in enumerate(data.nodes):
        cml_id = f"n{i}"
        node_id_map[node.node_id] = cml_id

        interfaces_yaml = [
            {"id": f"i{iface.slot}", "label": iface.name, "slot": iface.slot, "type": "physical"}
            for iface in node.interfaces
        ]

        cml_nodes.append(
            {
                "id": cml_id,
                "label": node.label,
                "node_definition": node.node_definition,
                "x": node.x,
                "y": node.y,
                "configuration": node_configs.get(node.node_id) or None,
                "interfaces": interfaces_yaml,
                "ram": None,
                "cpus": None,
                "cpu_limit": None,
                "boot_disk_size": None,
                "data_volume": None,
                "hide_links": False,
                "image_definition": None,
                "tags": [],
            }
        )

    # 3. リンクを構築
    links = []
    for i, edge in enumerate(data.edges):
        src = node_id_map.get(edge.src_node_id)
        dst = node_id_map.get(edge.dst_node_id)
        if not src or not dst:
            continue
        links.append(
            {
                "id": f"l{i}",
                "i1": f"{src}[i{edge.src_iface_slot}]",
                "i2": f"{dst}[i{edge.dst_iface_slot}]",
            }
        )

    # 4. CML topology YAML を構築
    topology = {
        "lab": {
            "title": data.title,
            "description": data.description,
            "notes": "",
            "timestamp": time.time(),
            "version": "0.1.0",
        },
        "nodes": cml_nodes,
        "links": links,
    }
    topology_yaml = yaml.dump(topology, allow_unicode=True, sort_keys=False)

    # 5. CML へインポート
    try:
        result = cml_client.import_topology(topology_yaml)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"CML connection error: {exc}") from exc

    return CMLLabResponse(
        lab_id=result["id"],
        title=result["title"],
        state=result.get("state"),
    )
