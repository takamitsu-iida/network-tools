import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  ConnectionMode,
  type Connection,
  type ReactFlowInstance,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import DeviceNode from './DeviceNode';
import { useTopologyStore } from '../../store/topologyStore';
import type { DeviceTemplate, DeviceNodeData } from '../../types';

const nodeTypes = { deviceNode: DeviceNode } as const;

let nodeIdSeq = 0;

export default function TopologyEditor() {
  const {
    nodes,
    edges,
    setEdges,
    addNode,
    onNodesChange,
    onEdgesChange,
    setSelectedNodeId,
  } = useTopologyStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges(addEdge(params, edges)),
    [edges, setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!rfInstance) return;

      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      const template = JSON.parse(raw) as DeviceTemplate;

      /** スクリーン座標をフロー座標に変換 */
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const id = `node-${++nodeIdSeq}`;
      const newNode: Node<DeviceNodeData> = {
        id,
        type: 'deviceNode',
        position,
        data: {
          label: `${template.device_type}-${nodeIdSeq}`,
          template,
          interfaces: {},
        },
      };

      addNode(newNode);
    },
    [rfInstance, addNode],
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        onInit={setRfInstance}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
        fitView
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls />
        <MiniMap nodeColor={() => '#94a3b8'} />
      </ReactFlow>
    </div>
  );
}
