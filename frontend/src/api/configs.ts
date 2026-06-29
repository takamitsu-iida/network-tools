import apiClient from './client';
import type { Node, Edge } from '@xyflow/react';
import type { DeviceNodeData } from '../types';

// ─── リクエスト / レスポンス型 ─────────────────────────────────────────────────

export interface InterfaceConfig {
  name: string;
  slot: number;
  ip_address: string;
  prefix_length: number;
  vlan_id: string;
  vrf_name: string;
}

export interface NodeConfigRequest {
  node_id: string;
  label: string;
  vendor: string;
  os: string;
  node_definition: string;
  x: number;
  y: number;
  interfaces: InterfaceConfig[];
  extra_params: Record<string, unknown>;
}

export interface NodeConfigResponse {
  node_id: string;
  label: string;
  config: string;
}

export interface TopologyConfigResponse {
  configs: NodeConfigResponse[];
}

export interface EdgeData {
  src_node_id: string;
  src_iface_slot: number;
  dst_node_id: string;
  dst_iface_slot: number;
}

export interface CMLPushRequest {
  title: string;
  description: string;
  nodes: NodeConfigRequest[];
  edges: EdgeData[];
  start_after_push: boolean;
}

export interface CMLLabResponse {
  lab_id: string;
  title: string;
  state: string | null;
}

// ─── 変換ヘルパー ────────────────────────────────────────────────────────────

/** React Flow ノードを API リクエスト形式に変換する */
export function nodeToConfigRequest(node: Node<DeviceNodeData>): NodeConfigRequest {
  const { template, interfaces, label } = node.data;
  return {
    node_id: node.id,
    label,
    vendor: template.vendor,
    os: template.os,
    node_definition: template.node_definition,
    x: Math.round(node.position.x),
    y: Math.round(node.position.y),
    interfaces: template.interfaces
      .filter((i) => i.type !== 'management')
      .map((i, index) => ({
        name: i.name,
        slot: i.slot ?? index,
        ip_address: interfaces[i.name]?.ip_address ?? '',
        prefix_length: interfaces[i.name]?.prefix_length ?? 24,
        vlan_id: interfaces[i.name]?.vlan_id ?? '',
        vrf_name: interfaces[i.name]?.vrf_name ?? '',
      })),
    extra_params: {},
  };
}

/** React Flow エッジを API リクエスト形式に変換する */
export function edgeToEdgeData(edge: Edge): EdgeData {
  return {
    src_node_id: edge.source,
    src_iface_slot: parseInt(edge.sourceHandle ?? '0', 10),
    dst_node_id: edge.target,
    dst_iface_slot: parseInt(edge.targetHandle ?? '0', 10),
  };
}

// ─── API 呼び出し ─────────────────────────────────────────────────────────────

export async function generateConfigs(
  nodes: NodeConfigRequest[],
): Promise<TopologyConfigResponse> {
  const { data } = await apiClient.post<TopologyConfigResponse>('/configs/preview', { nodes });
  return data;
}

export async function pushToCML(request: CMLPushRequest): Promise<CMLLabResponse> {
  const { data } = await apiClient.post<CMLLabResponse>('/configs/push-to-cml', request);
  return data;
}
