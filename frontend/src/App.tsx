import { useRef, useState } from 'react';
import DevicePalette from './components/palette/DevicePalette';
import TopologyEditor from './components/topology/TopologyEditor';
import NetworkSettingsForm from './components/forms/NetworkSettingsForm';
import ConfigPreviewPanel from './components/config/ConfigPreviewPanel';
import SimulationPanel from './components/simulation/SimulationPanel';
import { useTopologyStore } from './store/topologyStore';
import {
  generateConfigs,
  pushToCML,
  nodeToConfigRequest,
  edgeToEdgeData,
  type NodeConfigResponse,
} from './api/configs';
import { generateLayoutFromYaml } from './api/topologies';
import type { Node, Edge } from '@xyflow/react';
import type { DeviceNodeData } from './types';

export default function App() {
  const { setNodes, setEdges, nodes, edges, selectedNodeId, deleteSelectedNode } = useTopologyStore();
  const [topologyTitle, setTopologyTitle] = useState('新規トポロジ');
  const [configs, setConfigs] = useState<NodeConfigResponse[]>([]);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const yamlInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    if (!window.confirm('現在のトポロジをクリアしますか？')) return;
    setNodes([]);
    setEdges([]);
  };

  /** YAMLファイルを選択してAIレイアウトを生成する */
  const handleYamlImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsImporting(true);
    try {
      const yamlContent = await file.text();
      const result = await generateLayoutFromYaml(yamlContent);
      setNodes(result.nodes as Node<DeviceNodeData>[]);
      setEdges(result.edges as Edge[]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'YAML読み込みに失敗しました';
      alert(`YAMLインポートエラー:\n${message}`);
    } finally {
      setIsImporting(false);
    }
  };

  /** Config を生成してプレビューパネルを開く */
  const handleGenerateConfigs = async () => {
    if (nodes.length === 0) {
      alert('トポロジに機器が配置されていません');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateConfigs(nodes.map(nodeToConfigRequest));
      setConfigs(result.configs);
      setShowConfigPanel(true);
    } catch {
      alert('Config 生成に失敗しました。バックエンドが起動しているか確認してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  /** トポロジと Config を CML へ送信する */
  const handlePushToCML = async () => {
    setIsPushing(true);
    try {
      const result = await pushToCML({
        title: topologyTitle,
        description: '',
        nodes: nodes.map(nodeToConfigRequest),
        edges: edges.map(edgeToEdgeData),
        start_after_push: false,
      });
      alert(`CML へのインポートが完了しました。\nLab ID: ${result.lab_id}`);
      setShowConfigPanel(false);
    } catch {
      alert('CML へのインポートに失敗しました。CML サーバーへの接続を確認してください。');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* ツールバー */}
      <header className="h-12 bg-gray-900 text-white flex items-center px-4 gap-3 shrink-0">
        <span className="font-bold text-sm tracking-wide whitespace-nowrap">
          Network Design Tool
        </span>
        <div className="h-5 border-l border-gray-600" />
        <input
          type="text"
          value={topologyTitle}
          onChange={(e) => setTopologyTitle(e.target.value)}
          className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none focus:border-blue-400 w-52"
          aria-label="トポロジ名"
        />
        {/* 隠しファイル入力 */}
        <input
          ref={yamlInputRef}
          type="file"
          accept=".yaml,.yml"
          className="hidden"
          onChange={handleYamlImport}
        />
        <button
          onClick={() => yamlInputRef.current?.click()}
          disabled={isImporting}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors whitespace-nowrap"
          title="YAMLファイルを選択してAIがレイアウトを自動配置します"
        >
          {isImporting ? 'AI推論中...' : 'YAMLインポート (AI)'}
        </button>
        <button
          onClick={deleteSelectedNode}
          disabled={!selectedNodeId}
          className="text-xs bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors"
          title="選択中のノードと接続リンクを削除"
        >
          ノード削除
        </button>
        <button
          onClick={handleClear}
          className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
        >
          クリア
        </button>
        <button
          onClick={() => setShowSimPanel(true)}
          disabled={nodes.length < 2}
          className="text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors"
        >
          シミュレーション
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {nodes.length} 台 / {edges.length} リンク
          </span>
          <button
            onClick={handleGenerateConfigs}
            disabled={isGenerating || nodes.length === 0}
            className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors"
          >
            {isGenerating ? '生成中...' : 'Config プレビュー'}
          </button>
        </div>
      </header>

      {/* 3ペインレイアウト */}
      <div className="flex flex-1 overflow-hidden">
        <DevicePalette />
        <TopologyEditor />
        <NetworkSettingsForm />
      </div>

      {/* Config プレビューパネル（モーダル） */}
      {showConfigPanel && (
        <ConfigPreviewPanel
          configs={configs}
          onPushToCML={handlePushToCML}
          isPushing={isPushing}
          onClose={() => setShowConfigPanel(false)}
        />
      )}

      {/* シミュレーションパネル（モーダル） */}
      {showSimPanel && <SimulationPanel onClose={() => setShowSimPanel(false)} />}
    </div>
  );
}
