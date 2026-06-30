import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { DeviceNodeData, InterfaceDefinition } from '../../types';

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

/** portDirections がない場合のデフォルト順序：上・右・下・左 */
const SIDE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left];
const POSITION_KEY: Record<Position, string> = {
  [Position.Top]: 'top',
  [Position.Right]: 'right',
  [Position.Bottom]: 'bottom',
  [Position.Left]: 'left',
};
const KEY_POSITION: Record<string, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

function DeviceNode({ data, selected }: NodeProps<DeviceNodeType>) {
  const color = VENDOR_COLORS[data.template.vendor] ?? '#6b7280';
  const icon = DEVICE_TYPE_ICON[data.template.device_type] ?? '○';
  const dataInterfaces = data.template.interfaces.filter((i) => i.type !== 'management');

  /** 各インターフェースのポート方向を決定する */
  const getPosition = (iface: InterfaceDefinition, index: number): Position => {
    const dir = (data.portDirections as Record<string, string> | undefined)?.[iface.name];
    return dir ? (KEY_POSITION[dir] ?? SIDE_POSITIONS[index % 4]) : SIDE_POSITIONS[index % 4];
  };

  /** 同じ辺に複数ハンドルがある場合のオフセット計算用にグループ化 */
  const sideGroups: Record<string, string[]> = { top: [], right: [], bottom: [], left: [] };
  dataInterfaces.forEach((iface, index) => {
    const pos = getPosition(iface, index);
    sideGroups[POSITION_KEY[pos]].push(iface.name);
  });

  /** 同じ辺のハンドルを等間隔にオフセットする style を返す */
  const getHandleStyle = (ifaceName: string, position: Position): React.CSSProperties => {
    const key = POSITION_KEY[position];
    const siblings = sideGroups[key];
    if (siblings.length <= 1) return {};
    const idx = siblings.indexOf(ifaceName);
    const pct = ((idx + 1) / (siblings.length + 1)) * 100;
    if (position === Position.Top || position === Position.Bottom) {
      return { left: `${pct}%`, transform: 'translateX(-50%)' };
    }
    return { top: `${pct}%`, transform: 'translateY(-50%)' };
  };

  return (
    <div
      style={{ borderColor: selected ? '#3b82f6' : '#d1d5db' }}
      className="rounded-lg border-2 bg-white shadow-md w-36 select-none"
    >
      {/* インターフェースごとに Handle を配置 */}
      {dataInterfaces.map((iface, index) => {
        const position = getPosition(iface, index);
        return (
          <Handle
            key={iface.name}
            id={String(iface.slot ?? index)}
            type="source"
            position={position}
            title={iface.name}
            style={getHandleStyle(iface.name, position)}
            className="!w-3 !h-3 !bg-gray-400 hover:!bg-blue-500 transition-colors"
          />
        );
      })}

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
