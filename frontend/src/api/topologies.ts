import apiClient from './client';
import type { YamlLayoutResponse } from '../types';

export interface TopologySummary {
  id: string;
  title: string;
  description: string;
  state: string | null;
  node_count: number;
}

export async function fetchTopologies(): Promise<TopologySummary[]> {
  const { data } = await apiClient.get<TopologySummary[]>('/topologies/');
  return data;
}

export async function createTopology(
  title: string,
  description = '',
): Promise<TopologySummary> {
  const { data } = await apiClient.post<TopologySummary>('/topologies/', {
    title,
    description,
  });
  return data;
}

/** YAMLファイル内容からAIレイアウトを生成して ReactFlow 形式で返す */
export async function generateLayoutFromYaml(yamlContent: string): Promise<YamlLayoutResponse> {
  const { data } = await apiClient.post<YamlLayoutResponse>('/topologies/yaml-layout', {
    yaml_content: yamlContent,
  });
  return data;
}
