import { useState, lazy, Suspense } from 'react';
import type { NodeConfigResponse } from '../../api/configs';

// Monaco Editor は動的インポートでバンドルサイズを削減する
const Editor = lazy(() => import('@monaco-editor/react'));

interface Props {
  configs: NodeConfigResponse[];
  onPushToCML: () => void;
  isPushing: boolean;
  onClose: () => void;
}

export default function ConfigPreviewPanel({ configs, onPushToCML, isPushing, onClose }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(configs[0]?.node_id ?? '');

  const selectedConfig = configs.find((c) => c.node_id === selectedNodeId);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center px-5 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
          <h2 className="text-sm font-bold text-gray-700">Config プレビュー</h2>
          <span className="ml-3 text-xs text-gray-400">{configs.length} 台</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onPushToCML}
              disabled={isPushing}
              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors font-medium"
            >
              {isPushing ? '送信中...' : 'CML へ保存 & インポート'}
            </button>
            <button
              onClick={onClose}
              className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ノード一覧 */}
          <nav className="w-48 border-r border-gray-200 overflow-y-auto bg-gray-50 shrink-0">
            {configs.map((c) => (
              <button
                key={c.node_id}
                onClick={() => setSelectedNodeId(c.node_id)}
                className={`w-full text-left px-3 py-2.5 text-xs border-b border-gray-100 transition-colors ${
                  c.node_id === selectedNodeId
                    ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-l-blue-500'
                    : 'hover:bg-white text-gray-600'
                }`}
              >
                {c.label}
              </button>
            ))}
          </nav>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
            {selectedConfig ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    エディタを読み込み中...
                  </div>
                }
              >
                <Editor
                  height="100%"
                  language="plaintext"
                  value={selectedConfig.config}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    renderWhitespace: 'none',
                    padding: { top: 12 },
                  }}
                />
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                ノードを選択してください
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
