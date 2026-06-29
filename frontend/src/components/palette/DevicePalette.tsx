import { useEffect, useState } from 'react';
import { fetchTemplates } from '../../api/templates';
import PaletteItem from './PaletteItem';
import type { DeviceTemplate } from '../../types';

export default function DevicePalette() {
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => setError('テンプレートの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  /** ベンダー別にグループ化 */
  const grouped = templates.reduce<Record<string, DeviceTemplate[]>>((acc, t) => {
    (acc[t.vendor] ??= []).push(t);
    return acc;
  }, {});

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <h2 className="text-sm font-bold text-gray-700">機器テンプレート</h2>
        <p className="text-xs text-gray-400 mt-0.5">ドラッグ&amp;ドロップで配置</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <p className="text-xs text-gray-400 p-2 text-center">読み込み中...</p>
        )}
        {error && <p className="text-xs text-red-500 p-2">{error}</p>}

        {Object.entries(grouped).map(([vendor, items]) => (
          <div key={vendor} className="mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 mb-1">
              {vendor}
            </p>
            {items.map((template) => (
              <PaletteItem
                key={`${template.vendor}-${template.node_definition}`}
                template={template}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
