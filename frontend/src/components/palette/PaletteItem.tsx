import type { DeviceTemplate } from '../../types';

const DEVICE_TYPE_ICON: Record<string, string> = {
  router: '⬡',
  switch: '⬢',
  firewall: '▣',
};

interface Props {
  template: DeviceTemplate;
}

export default function PaletteItem({ template }: Props) {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 px-2 py-2 rounded cursor-grab active:cursor-grabbing hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors"
    >
      <span className="text-xl shrink-0">{DEVICE_TYPE_ICON[template.device_type] ?? '○'}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-800 truncate">{template.description}</p>
        <p className="text-xs text-gray-400">{template.os}</p>
      </div>
    </div>
  );
}
