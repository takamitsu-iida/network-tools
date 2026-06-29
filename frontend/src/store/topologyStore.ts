import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { DeviceNodeData, InterfaceSettings } from '../types';

interface TopologyState {
  nodes: Node<DeviceNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  setNodes: (nodes: Node<DeviceNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node<DeviceNodeData>) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  updateNodeInterfaceSettings: (
    nodeId: string,
    ifaceName: string,
    settings: InterfaceSettings,
  ) => void;
}

export const useTopologyStore = create<TopologyState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  onNodesChange: (changes) =>
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes) as Node<DeviceNodeData>[],
    })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  updateNodeLabel: (nodeId, label) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label } } : n,
      ),
    })),

  updateNodeInterfaceSettings: (nodeId, ifaceName, settings) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                interfaces: { ...n.data.interfaces, [ifaceName]: settings },
              },
            }
          : n,
      ),
    })),
}));
