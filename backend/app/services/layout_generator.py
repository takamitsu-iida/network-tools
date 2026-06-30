"""YAMLトポロジ定義からOpenAIを使ってレイアウトを生成するサービス"""
from __future__ import annotations

import json
from pathlib import Path

import yaml
from openai import OpenAI
from pydantic import BaseModel

from app.config import settings
from app.schemas.device import DeviceTemplate


# ---------- LLM出力の内部モデル ----------


class _NodeLayout(BaseModel):
    id: str
    x: float
    y: float
    port_directions: dict[str, str] = {}


class _LLMResult(BaseModel):
    nodes: list[_NodeLayout]


# ---------- 内部ヘルパー ----------


def _load_template(template_key: str) -> DeviceTemplate:
    """'vendor/name' 形式のキーからテンプレートを読み込む"""
    if "/" not in template_key:
        raise ValueError(f"template は 'vendor/name' 形式で指定してください: {template_key!r}")
    vendor, name = template_key.split("/", 1)
    path = Path(settings.templates_dir) / vendor / f"{name}.yaml"
    if not path.exists():
        raise ValueError(f"テンプレートが見つかりません: {template_key}")
    with path.open(encoding="utf-8") as f:
        return DeviceTemplate(**yaml.safe_load(f))


def _handle_id(ifaces: list, iface_name: str) -> str:
    """インターフェース名から ReactFlow Handle ID を返す"""
    for idx, iface in enumerate(ifaces):
        if iface.name == iface_name:
            return str(iface.slot if iface.slot is not None else idx)
    return "0"


# ---------- 公開関数 ----------


def generate_layout_from_yaml(yaml_content: str) -> dict:
    """YAMLトポロジをパースしてOpenAIでレイアウトを推論し、ReactFlow形式のJSONを返す"""

    raw_data = yaml.safe_load(yaml_content)
    if not isinstance(raw_data, dict):
        raise ValueError("YAMLのトップレベルはマッピング(dict)である必要があります")

    nodes_yaml: list[dict] = raw_data.get("nodes", [])
    links_yaml: list[dict] = raw_data.get("links", [])

    if not nodes_yaml:
        raise ValueError("YAMLに nodes が定義されていません")

    # テンプレートの読み込み
    templates: dict[str, DeviceTemplate] = {}
    for node in nodes_yaml:
        node_id = node.get("id")
        if not node_id:
            raise ValueError("nodes の各要素に id が必要です")
        templates[node_id] = _load_template(node.get("template", ""))

    # LLMプロンプト構築
    node_lines = []
    for node in nodes_yaml:
        nid = node["id"]
        tmpl = templates[nid]
        data_ifaces = [i.name for i in tmpl.interfaces if i.type != "management"]
        node_lines.append(
            f"- id={nid!r}, label={node.get('label', nid)!r}, "
            f"vendor={tmpl.vendor}, device_type={tmpl.device_type}, os={tmpl.os}, "
            f"data_interfaces={data_ifaces}"
        )

    link_lines = [
        f"- {lk['source']}:{lk['source_interface']} <-> "
        f"{lk['target']}:{lk['target_interface']}"
        for lk in links_yaml
    ] or ["(リンクなし)"]

    prompt = f"""\
あなたはネットワーク図のレイアウト専門家です。
与えられたネットワークトポロジに対して、GUI表示用の最適な視覚的配置を決定してください。

【ネットワークノード】
{chr(10).join(node_lines)}

【リンク（接続関係）】
{chr(10).join(link_lines)}

【キャンバスサイズ】1200 x 800 ピクセル。ノードサイズ: 約150 x 120 px。

【配置ルール】
1. ネットワーク階層を device_type と接続数から推測する:
   - コア/バックボーン(router、または接続数が多い): 上部 y: 100〜200
   - ディストリビューション(switch で多接続): 中段 y: 300〜400
   - アクセス/エッジ(switch で少接続、またはfirewall): 下部 y: 500〜650
2. 同じ階層のノードは水平方向に均等配置（左右のマージン 150px 以上確保）
3. ノード中心間の最小間隔: 220px
4. 全ノードを範囲内に収める: x in [100, 1100], y in [100, 700]

【ポート方向ルール】（各インターフェースがノードのどの辺に表示されるか）
- 自ノードより上に位置するノードと繋がる → "top"
- 自ノードより下に位置するノードと繋がる → "bottom"
- 自ノードより左に位置するノードと繋がる → "left"
- 自ノードより右に位置するノードと繋がる → "right"
- 繋がっていないインターフェース → 空き辺を割り当てる（"right" か "bottom" を優先）

マークダウン・説明文を一切含めず、下記形式のJSONのみを返してください:
{{
  "nodes": [
    {{
      "id": "<node_id>",
      "x": <number>,
      "y": <number>,
      "port_directions": {{
        "<interface_name>": "top|right|bottom|left"
      }}
    }}
  ]
}}"""

    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY が設定されていません")

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    raw_json = response.choices[0].message.content or "{}"
    llm_result = _LLMResult(**json.loads(raw_json))

    layout_by_id: dict[str, _NodeLayout] = {n.id: n for n in llm_result.nodes}

    # ReactFlow ノード構築
    rf_nodes = []
    for node in nodes_yaml:
        nid = node["id"]
        tmpl = templates[nid]
        layout = layout_by_id.get(nid)
        rf_nodes.append({
            "id": nid,
            "type": "deviceNode",
            "position": {
                "x": float(layout.x) if layout else 100.0,
                "y": float(layout.y) if layout else 100.0,
            },
            "data": {
                "label": node.get("label", nid),
                "template": tmpl.model_dump(),
                "interfaces": {},
                "portDirections": layout.port_directions if layout else {},
            },
        })

    # ReactFlow エッジ構築
    rf_edges = []
    for i, lk in enumerate(links_yaml):
        src_id = lk["source"]
        dst_id = lk["target"]
        src_iface_name = lk["source_interface"]
        dst_iface_name = lk["target_interface"]

        src_data_ifaces = [
            iface for iface in templates[src_id].interfaces if iface.type != "management"
        ]
        dst_data_ifaces = [
            iface for iface in templates[dst_id].interfaces if iface.type != "management"
        ]

        rf_edges.append({
            "id": f"yaml-edge-{i}",
            "source": src_id,
            "sourceHandle": _handle_id(src_data_ifaces, src_iface_name),
            "target": dst_id,
            "targetHandle": _handle_id(dst_data_ifaces, dst_iface_name),
        })

    return {"nodes": rf_nodes, "edges": rf_edges}
