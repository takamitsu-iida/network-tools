import apiClient from './client';

export type TrafficPattern = 'uniform' | 'bursty' | 'ramp';
export type FailureType = 'node_down' | 'link_down';

export interface TopologyNodeForSim {
  node_id: string;
  label: string;
}

export interface TopologyLinkForSim {
  src_node_id: string;
  dst_node_id: string;
}

export interface TrafficSimRequest {
  src_node_id: string;
  dst_node_id: string;
  traffic_pattern: TrafficPattern;
  bandwidth_mbps: number;
  duration_sec: number;
  nodes: TopologyNodeForSim[];
  links: TopologyLinkForSim[];
}

export interface FailureScenarioRequest {
  failure_type: FailureType;
  target_id: string;
  traffic_sim: TrafficSimRequest;
}

export interface MetricPoint {
  timestamp: number;
  bandwidth_mbps: number;
  latency_ms: number;
  packet_loss_pct: number;
}

export interface PathInfo {
  hops: string[];
  hop_labels: string[];
  reachable: boolean;
}

export interface SimulationResult {
  sim_id: string;
  status: string;
  src_label: string;
  dst_label: string;
  metrics: MetricPoint[];
  path_before: PathInfo;
  path_after?: PathInfo;
  failure_applied: boolean;
  failure_type?: string;
  failure_target?: string;
  summary: Record<string, unknown>;
}

export async function runTrafficSimulation(
  request: TrafficSimRequest,
): Promise<SimulationResult> {
  const { data } = await apiClient.post<SimulationResult>('/simulations/traffic', request);
  return data;
}

export async function runFailureSimulation(
  request: FailureScenarioRequest,
): Promise<SimulationResult> {
  const { data } = await apiClient.post<SimulationResult>('/simulations/failure', request);
  return data;
}
