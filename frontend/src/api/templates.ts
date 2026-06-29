import apiClient from './client';
import type { DeviceTemplate } from '../types';

export async function fetchTemplates(): Promise<DeviceTemplate[]> {
  const { data } = await apiClient.get<DeviceTemplate[]>('/templates/');
  return data;
}
