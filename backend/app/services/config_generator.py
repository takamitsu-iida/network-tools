import ipaddress
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, Undefined

from app.config import settings
from app.schemas.config import NodeConfigRequest


def _prefix_to_netmask(prefix_length: int) -> str:
    """プレフィックス長をサブネットマスクに変換 (24 → '255.255.255.0')"""
    return str(ipaddress.IPv4Network(f"0.0.0.0/{prefix_length}").netmask)


class ConfigGenerator:
    """Jinja2 テンプレートを使用して機器 Config を生成するサービス"""

    def __init__(self) -> None:
        templates_path = Path(settings.config_templates_dir)
        self._env = Environment(
            loader=FileSystemLoader(str(templates_path)),
            autoescape=False,
            trim_blocks=True,
            lstrip_blocks=True,
            undefined=Undefined,  # 未定義変数は空文字列として扱う
        )
        self._env.filters["prefix_to_netmask"] = _prefix_to_netmask

    def generate(self, node: NodeConfigRequest) -> str:
        """ベンダー/OS に対応するテンプレートを使って Config テキストを生成する"""
        template_path = f"{node.vendor}/{node.os}.j2"
        try:
            template = self._env.get_template(template_path)
        except Exception as exc:
            raise FileNotFoundError(
                f"Config template not found: {template_path}"
            ) from exc

        context: dict = {
            "hostname": node.label,
            "interfaces": [
                {
                    "name": iface.name,
                    "slot": iface.slot,
                    "ip_address": iface.ip_address,
                    "prefix_length": iface.prefix_length,
                    "netmask": _prefix_to_netmask(iface.prefix_length),
                    "vlan_id": iface.vlan_id,
                    "vrf_name": iface.vrf_name,
                    "has_ip": bool(iface.ip_address),
                }
                for iface in node.interfaces
            ],
            **node.extra_params,
        }
        return template.render(context)


config_generator = ConfigGenerator()
