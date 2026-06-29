import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { DeviceNodeData } from '../../types';

type DeviceNodeType = Node<DeviceNodeData, 'deviceNode'>;

const VENDOR_COLORS: Record<string, string> = {
  cisco: '#1d4ed8',
  juniper: '#15803d',
  aruba: '#ea580c',
  fortinet: '#dc2626',
};

const DEVICE_TYPE_ICON: Record<string, string> = {
  router: '⬡',
  switch: '⬢',
  firewall: '▣',
};

/** 最大4インターフェースを上・右・下・左に1つずつ配置 */
const SIDE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function DeviceNode({ data, selected }: NodeProps<DeviceNodeType>) {
  const color = VENDOR_COLORS[data.template.vendor] ?? '#6b7280';
  const icon = DEVICE_TYPE_ICON[data.template.device_type] ?? '○';
  const dataInterfaces = data.template.interfaces.filter((i) => i.type !== 'management');

  return (
    <div
      style={{ borderColor: selected ? '#3b82f6' : '#d1d5db' }}
      className="rounded-lg border-2 bg-white shadow-md w-36 select-none"
    >
      {/* インターフェースごとに Handle を配置（上右下左を順番に使用） */}
      {dataInterfaces.map((iface, index) => (
        <Handle
          key={iface.name}
          id={String(iface.slot ?? index)}
          type="source"
          position={SIDE_POSITIONS[index % 4]}
          title={iface.name}
          className="!w-3 !h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
        />
      ))}

      {/* ベンダーカラーヘッダー */}
      <div
        style={{ backgroundColor: color }}
        className="text-white text-xs font-bold px-2 py-1 rounded-t-md truncate"
      >
        {data.template.vendor.charAt(0).toUpperCase() + data.template.vendor.slice(1)}
      </div>

      {/* 機器アイコン・ラベル */}
      <div className="flex flex-col items-center py-3 px-2 gap-1">
        <span className="text-3xl leading-none">{icon}</span>
        <span className="text-xs font-semibold text-gray-800 truncate w-full text-center">
          {data.label}
        </span>
        <span className="text-xs text-gray-400">{data.template.os}</span>
      </div>
    </div>
  );
}

export default memo(DeviceNode);
