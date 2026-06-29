import apiClient from './client';

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
