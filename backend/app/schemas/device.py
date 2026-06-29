from pydantic import BaseModel
from typing import Optional, Union


class InterfaceDefinition(BaseModel):
    name: str
    type: str  # ethernet, serial, loopback, management
    slot: Optional[int] = None


class ConfigParameter(BaseModel):
    name: str
    type: str  # string, integer, boolean, enum
    required: bool = False
    default: Optional[Union[str, int, bool]] = None
    choices: Optional[list[str]] = None
    description: str = ""


class DeviceTemplate(BaseModel):
    vendor: str
    os: str
    device_type: str  # router, switch, firewall
    description: str
    node_definition: str  # CML node definition name
    default_ram: int = 512
    default_cpus: int = 1
    interfaces: list[InterfaceDefinition] = []
    config_parameters: list[ConfigParameter] = []
