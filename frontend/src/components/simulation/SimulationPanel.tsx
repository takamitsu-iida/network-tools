import { useState, type ReactNode } from 'react';
import { useTopologyStore } from '../../store/topologyStore';
import MetricsChart from './MetricsChart';
import {
  runTrafficSimulation,
  runFailureSimulation,
  type TrafficPattern,
  type FailureType,
  type SimulationResult,
  type PathInfo,
} from '../../api/simulations';

interface Props {
  onClose: () => void;
}

const PATTERN_OPTIONS: { value: TrafficPattern; label: string }[] = [
  { value: 'uniform', label: '均一 (Uniform)' },
  { value: 'bursty', label: 'バースト (Bursty)' },
  { value: 'ramp', label: '増加 (Ramp)' },
];

const FAILURE_TYPE_OPTIONS: { value: FailureType; label: string }[] = [
  { value: 'node_down', label: 'ノード障害 (Node Down)' },
  { value: 'link_down', label: 'リンク断 (Link Down)' },
];

export default function SimulationPanel({ onClose }: Props) {
  const { nodes: storeNodes, edges: storeEdges } = useTopologyStore();

  const simNodes = storeNodes.map((n) => ({ node_id: n.id, label: n.data.label }));
  const simLinks = storeEdges.map((e) => ({ src_node_id: e.source, dst_node_id: e.target }));

  // トラフィック設定
  const [srcId, setSrcId] = useState(simNodes[0]?.node_id ?? '');
  const [dstId, setDstId] = useState(simNodes[1]?.node_id ?? simNodes[0]?.node_id ?? '');
  const [pattern, setPattern] = useState<TrafficPattern>('uniform');
  const [bandwidth, setBandwidth] = useState(100);
  const [duration, setDuration] = useState(60);

  // 障害設定
  const [failureType, setFailureType] = useState<FailureType>('node_down');
  const [failureTarget, setFailureTarget] = useState('');

  // 結果
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildTrafficReq = () => ({
    src_node_id: srcId,
    dst_node_id: dstId,
    traffic_pattern: pattern,
    bandwidth_mbps: bandwidth,
    duration_sec: duration,
    nodes: simNodes,
    links: simLinks,
  });

  const handleRunTraffic = async () => {
    if (!srcId || !dstId || srcId === dstId) {
      setError('送信元と宛先に異なるノードを選択してください');
      return;
    }
    setError(null);
    setIsRunning(true);
    try {
      setResult(await runTrafficSimulation(buildTrafficReq()));
    } catch {
      setError('シミュレーションに失敗しました。バックエンドが起動しているか確認してください。');
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunFailure = async () => {
    if (!srcId || !dstId || srcId === dstId) {
      setError('送信元と宛先に異なるノードを選択してください');
      return;
    }
    if (!failureTarget) {
      setError('障害対象を選択してください');
      return;
    }
    setError(null);
    setIsRunning(true);
    try {
      setResult(
        await runFailureSimulation({
          failure_type: failureType,
          target_id: failureTarget,
          traffic_sim: buildTrafficReq(),
        }),
      );
    } catch {
      setError('障害シミュレーションに失敗しました。');
    } finally {
      setIsRunning(false);
    }
  };

  /** 障害対象の選択肢（障害種別に応じて変化） */
  const failureTargetOptions =
    failureType === 'node_down'
      ? simNodes.map((n) => ({ value: n.node_id, label: n.label }))
      : storeEdges.map((e) => {
          const sl = simNodes.find((n) => n.node_id === e.source)?.label ?? e.source;
          const dl = simNodes.find((n) => n.node_id === e.target)?.label ?? e.target;
          return { value: `${e.source}:${e.target}`, label: `${sl} ↔ ${dl}` };
        });

  const failureStartSec =
    result?.failure_applied && result.summary.failure_start_sec !== undefined
      ? (result.summary.failure_start_sec as number)
      : undefined;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-950 text-gray-100 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-gray-800">
        {/* ヘッダー */}
        <div className="flex items-center px-5 py-3 border-b border-gray-800 shrink-0">
          <span className="text-sm font-bold">📊 トラフィックシミュレーション</span>
          {result && (
            <span className="ml-3 text-xs text-gray-500">
              {result.src_label} → {result.dst_label}
            </span>
          )}
          <button
            onClick={onClose}
            className="ml-auto text-gray-500 hover:text-white text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左カラム: 設定フォーム */}
          <div className="w-64 border-r border-gray-800 p-4 overflow-y-auto shrink-0 space-y-4 bg-gray-900">
            {/* トラフィック設定 */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                トラフィック設定
              </h3>

              <FormField label="送信元">
                <SimSelect value={srcId} onChange={setSrcId}>
                  {simNodes.map((n) => (
                    <option key={n.node_id} value={n.node_id}>
                      {n.label}
                    </option>
                  ))}
                </SimSelect>
              </FormField>

              <FormField label="宛先">
                <SimSelect value={dstId} onChange={setDstId}>
                  {simNodes.map((n) => (
                    <option key={n.node_id} value={n.node_id}>
                      {n.label}
                    </option>
                  ))}
                </SimSelect>
              </FormField>

              <FormField label="パターン">
                <SimSelect value={pattern} onChange={(v) => setPattern(v as TrafficPattern)}>
                  {PATTERN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SimSelect>
              </FormField>

              <FormField label="帯域 (Mbps)">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={bandwidth}
                  onChange={(e) => setBandwidth(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </FormField>

              <FormField label="期間 (秒)">
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
              </FormField>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                onClick={handleRunTraffic}
                disabled={isRunning || simNodes.length < 2}
                className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium py-2 rounded transition-colors"
              >
                {isRunning ? '実行中...' : '▶ シミュレーション実行'}
              </button>
            </section>

            <hr className="border-gray-800" />

            {/* 障害シナリオ */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-orange-500 uppercase tracking-wide">
                ⚠ 障害シナリオ
              </h3>

              <FormField label="障害種別">
                <SimSelect
                  value={failureType}
                  onChange={(v) => {
                    setFailureType(v as FailureType);
                    setFailureTarget('');
                  }}
                >
                  {FAILURE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SimSelect>
              </FormField>

              <FormField label="障害対象">
                <SimSelect value={failureTarget} onChange={setFailureTarget}>
                  <option value="">-- 選択 --</option>
                  {failureTargetOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SimSelect>
              </FormField>

              <button
                onClick={handleRunFailure}
                disabled={isRunning || !failureTarget || simNodes.length < 2}
                className="w-full bg-orange-700 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium py-2 rounded transition-colors"
              >
                {isRunning ? '実行中...' : '⚡ 障害シミュレーション'}
              </button>
            </section>
          </div>

          {/* 右カラム: 結果 */}
          <div className="flex-1 overflow-y-auto p-5">
            {result ? (
              <ResultsView result={result} failureStartSec={failureStartSec} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                <span className="text-5xl">📡</span>
                <p className="text-sm">左のフォームからシミュレーションを実行してください</p>
                {simNodes.length < 2 && (
                  <p className="text-xs text-orange-500">
                    ※ トポロジに2台以上の機器を配置してください
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── サブコンポーネント ──────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function SimSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
    >
      {children}
    </select>
  );
}

function PathDisplay({ info, label }: { info: PathInfo; label: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-500 shrink-0 pt-0.5 w-14">{label}:</span>
      {info.reachable ? (
        <span className="text-xs text-green-400 break-all">
          {info.hop_labels.join(' → ')}
          <span className="text-gray-600 ml-1">({info.hops.length - 1} ホップ)</span>
        </span>
      ) : (
        <span className="text-xs text-red-400 font-medium">到達不可</span>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ResultsView({
  result,
  failureStartSec,
}: {
  result: SimulationResult;
  failureStartSec?: number;
}) {
  const s = result.summary;
  return (
    <div className="space-y-4">
      {/* 経路情報 */}
      <div className="bg-gray-900 rounded-lg p-4 space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">経路情報</h4>
        <PathDisplay info={result.path_before} label="経路" />
        {result.path_after && <PathDisplay info={result.path_after} label="障害後" />}
        {result.failure_applied && failureStartSec !== undefined && (
          <p className="text-xs text-orange-400 mt-1">
            ⚠ {failureStartSec} 秒以降に障害が発生
            {result.path_after?.reachable ? '（代替経路へ切替）' : '（通信断）'}
          </p>
        )}
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="平均帯域"
          value={`${s.avg_bandwidth_mbps} Mbps`}
          color="text-green-400"
        />
        <SummaryCard
          label="平均遅延"
          value={`${s.avg_latency_ms} ms`}
          color="text-blue-400"
        />
        <SummaryCard
          label="平均パケットロス"
          value={`${s.avg_packet_loss_pct} %`}
          color="text-red-400"
        />
      </div>

      {/* グラフ */}
      <div className="space-y-3">
        <MetricsChart
          metrics={result.metrics}
          field="bandwidth_mbps"
          label="帯域"
          color="#22c55e"
          unit="Mbps"
        />
        <MetricsChart
          metrics={result.metrics}
          field="latency_ms"
          label="遅延"
          color="#3b82f6"
          unit="ms"
        />
        <MetricsChart
          metrics={result.metrics}
          field="packet_loss_pct"
          label="パケットロス"
          color="#ef4444"
          unit="%"
        />
      </div>
    </div>
  );
}
