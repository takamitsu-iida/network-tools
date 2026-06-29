from pathlib import Path

import yaml
from fastapi import APIRouter, HTTPException

from app.config import settings
from app.schemas.device import DeviceTemplate

router = APIRouter(prefix="/templates", tags=["templates"])


def _load_all_templates() -> list[DeviceTemplate]:
    templates_path = Path(settings.templates_dir)
    result: list[DeviceTemplate] = []
    for yaml_file in sorted(templates_path.rglob("*.yaml")):
        try:
            with yaml_file.open(encoding="utf-8") as f:
                data = yaml.safe_load(f)
            result.append(DeviceTemplate(**data))
        except Exception:
            continue
    return result


@router.get("/", response_model=list[DeviceTemplate])
def list_templates() -> list[DeviceTemplate]:
    return _load_all_templates()


@router.get("/{vendor}/{name}", response_model=DeviceTemplate)
def get_template(vendor: str, name: str) -> DeviceTemplate:
    template_path = Path(settings.templates_dir) / vendor / f"{name}.yaml"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    with template_path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return DeviceTemplate(**data)
