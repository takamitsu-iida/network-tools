import { useTopologyStore } from '../../store/topologyStore';
import type { InterfaceSettings } from '../../types';

const EMPTY_SETTINGS: InterfaceSettings = {
  ip_address: '',
  prefix_length: 24,
  vlan_id: '',
  vrf_name: '',
};

export default function NetworkSettingsForm() {
  const { nodes, selectedNodeId, updateNodeLabel, updateNodeInterfaceSettings } =
    useTopologyStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <aside className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-bold text-gray-700">プロパティ</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-400">機器を選択してください</p>
        </div>
      </aside>
    );
  }

  const { data } = selectedNode;
  const dataInterfaces = data.template.interfaces.filter((i) => i.type !== 'management');

  return (
    <aside className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <h2 className="text-sm font-bold text-gray-700">プロパティ</h2>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{data.template.description}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* ホスト名 */}
        <section>
          <label className="text-xs font-semibold text-gray-600 block mb-1">ホスト名</label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </section>

        {/* 機器情報 */}
        <section className="text-xs text-gray-500 space-y-0.5 bg-gray-50 rounded p-2">
          <p>
            ベンダー:{' '}
            <span className="font-medium text-gray-700">{data.template.vendor}</span>
          </p>
          <p>
            OS: <span className="font-medium text-gray-700">{data.template.os}</span>
          </p>
          <p>
            種別:{' '}
            <span className="font-medium text-gray-700">{data.template.device_type}</span>
          </p>
        </section>

        {/* インターフェース設定 */}
        <section>
          <p className="text-xs font-semibold text-gray-600 mb-2">インターフェース設定</p>
          <div className="space-y-3">
            {dataInterfaces.map((iface) => {
              const settings: InterfaceSettings =
                data.interfaces[iface.name] ?? EMPTY_SETTINGS;

              const update = (field: keyof InterfaceSettings, value: string | number) => {
                updateNodeInterfaceSettings(selectedNode.id, iface.name, {
                  ...settings,
                  [field]: value,
                });
              };

              return (
                <div key={iface.name} className="bg-gray-50 rounded-md p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-600">{iface.name}</p>
                  <Field
                    label="IP アドレス"
                    value={settings.ip_address}
                    placeholder="192.168.1.1"
                    onChange={(v) => update('ip_address', v)}
                  />
                  <Field
                    label="プレフィックス長"
                    type="number"
                    value={String(settings.prefix_length)}
                    placeholder="24"
                    onChange={(v) => update('prefix_length', Number(v))}
                  />
                  <Field
                    label="VLAN ID"
                    value={settings.vlan_id}
                    placeholder="100"
                    onChange={(v) => update('vlan_id', v)}
                  />
                  <Field
                    label="VRF 名"
                    value={settings.vrf_name}
                    placeholder="MGMT"
                    onChange={(v) => update('vrf_name', v)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}

interface FieldProps {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}

function Field({ label, value, placeholder, type = 'text', onChange }: FieldProps) {
  return (
    <div className="grid grid-cols-5 gap-1 items-center">
      <label className="text-xs text-gray-500 col-span-2 leading-tight">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="col-span-3 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  );
}
