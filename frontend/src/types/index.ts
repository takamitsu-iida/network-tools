export interface InterfaceDefinition {
  name: string;
  type: string;
  slot: number | null;
}

export interface ConfigParameter {
  name: string;
  type: string;
  required: boolean;
  default?: string | number | boolean | null;
  choices?: string[];
  description: string;
}

export interface DeviceTemplate {
  vendor: string;
  os: string;
  device_type: string;
  description: string;
  node_definition: string;
  default_ram: number;
  default_cpus: number;
  interfaces: InterfaceDefinition[];
  config_parameters: ConfigParameter[];
}

export interface InterfaceSettings {
  ip_address: string;
  prefix_length: number;
  vlan_id: string;
  vrf_name: string;
}

/** React Flow v12 requires node data to extend Record<string, unknown> */
export interface DeviceNodeData extends Record<string, unknown> {
  label: string;
  template: DeviceTemplate;
  interfaces: Record<string, InterfaceSettings>;
}
