from virl2_client import ClientLibrary

from app.config import settings


class CMLClient:
    """Cisco Modeling Labs REST API ラッパー"""

    def __init__(self) -> None:
        self._client: ClientLibrary | None = None

    def connect(self) -> ClientLibrary:
        if self._client is None:
            self._client = ClientLibrary(
                url=settings.cml_url,
                username=settings.cml_username,
                password=settings.cml_password,
                ssl_verify=settings.cml_ssl_verify,
            )
        return self._client

    def get_all_labs(self) -> list[dict]:
        client = self.connect()
        labs = client.all_labs()
        return [
            {
                "id": lab.id,
                "title": lab.title,
                "description": lab.description,
                "state": lab.state(),
                "node_count": len(lab.nodes()),
            }
            for lab in labs
        ]

    def get_lab(self, lab_id: str) -> dict:
        client = self.connect()
        lab = client.join_existing_lab(lab_id)
        return {
            "id": lab.id,
            "title": lab.title,
            "description": lab.description,
            "state": lab.state(),
            "nodes": [
                {
                    "id": node.id,
                    "label": node.label,
                    "node_definition": node.node_definition,
                    "x": node.x,
                    "y": node.y,
                    "state": node.state,
                }
                for node in lab.nodes()
            ],
            "links": [
                {
                    "id": link.id,
                    "src_node": link.interface_a.node.id,
                    "src_interface": link.interface_a.id,
                    "dst_node": link.interface_b.node.id,
                    "dst_interface": link.interface_b.id,
                }
                for link in lab.links()
            ],
        }

    def create_lab(self, title: str, description: str = "") -> dict:
        client = self.connect()
        lab = client.create_lab(title=title, description=description)
        return {
            "id": lab.id,
            "title": lab.title,
            "description": lab.description,
            "state": None,
            "node_count": 0,
        }

    def delete_lab(self, lab_id: str) -> None:
        client = self.connect()
        lab = client.join_existing_lab(lab_id)
        lab.remove()

    def add_node(
        self,
        lab_id: str,
        label: str,
        node_definition: str,
        x: int = 0,
        y: int = 0,
    ) -> dict:
        client = self.connect()
        lab = client.join_existing_lab(lab_id)
        node = lab.create_node(
            label=label,
            node_definition=node_definition,
            x=x,
            y=y,
        )
        return {
            "id": node.id,
            "label": node.label,
            "node_definition": node.node_definition,
            "x": node.x,
            "y": node.y,
            "state": node.state,
        }

    def add_link(
        self,
        lab_id: str,
        src_node_id: str,
        src_iface_slot: int,
        dst_node_id: str,
        dst_iface_slot: int,
    ) -> dict:
        client = self.connect()
        lab = client.join_existing_lab(lab_id)
        src_node = lab.get_node_by_id(src_node_id)
        dst_node = lab.get_node_by_id(dst_node_id)
        src_iface = src_node.get_interface_by_slot(src_iface_slot)
        dst_iface = dst_node.get_interface_by_slot(dst_iface_slot)
        link = lab.create_link(src_iface, dst_iface)
        return {
            "id": link.id,
            "src_node": src_node_id,
            "src_interface": src_iface.id,
            "dst_node": dst_node_id,
            "dst_interface": dst_iface.id,
        }

    def import_topology(self, topology_yaml: str) -> dict:
        client = self.connect()
        lab = client.import_lab(topology_yaml, title=None)
        return {
            "id": lab.id,
            "title": lab.title,
            "description": lab.description,
            "state": None,
            "node_count": len(lab.nodes()),
        }


cml_client = CMLClient()
