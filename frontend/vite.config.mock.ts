import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin, IncomingMessage, ServerResponse } from 'vite';

// ─── モックデータ ─────────────────────────────────────────────────────────────

const MOCK_TEMPLATES = [
  {
    vendor: 'cisco', os: 'ios', device_type: 'router',
    description: 'Cisco IOS Virtual Router (IOSv)',
    node_definition: 'iosv', default_ram: 512, default_cpus: 1,
    interfaces: [
      { name: 'GigabitEthernet0/0', type: 'ethernet', slot: 0 },
      { name: 'GigabitEthernet0/1', type: 'ethernet', slot: 1 },
      { name: 'GigabitEthernet0/2', type: 'ethernet', slot: 2 },
      { name: 'GigabitEthernet0/3', type: 'ethernet', slot: 3 },
    ],
    config_parameters: [
      { name: 'hostname', type: 'string', required: true, description: 'Device hostname' },
      { name: 'domain_name', type: 'string', required: false, default: 'example.com', description: 'IP domain name' },
      { name: 'enable_secret', type: 'string', required: true, description: 'Enable secret password' },
    ],
  },
  {
    vendor: 'cisco', os: 'nxos', device_type: 'switch',
    description: 'Cisco NX-OS Virtual Switch (NX-OSv)',
    node_definition: 'nxosv', default_ram: 4096, default_cpus: 2,
    interfaces: [
      { name: 'Ethernet1/1',  type: 'ethernet', slot: 0 },
      { name: 'Ethernet1/2',  type: 'ethernet', slot: 1 },
      { name: 'Ethernet1/3',  type: 'ethernet', slot: 2 },
      { name: 'Ethernet1/4',  type: 'ethernet', slot: 3 },
      { name: 'Ethernet1/5',  type: 'ethernet', slot: 4 },
      { name: 'Ethernet1/6',  type: 'ethernet', slot: 5 },
      { name: 'Ethernet1/7',  type: 'ethernet', slot: 6 },
      { name: 'Ethernet1/8',  type: 'ethernet', slot: 7 },
      { name: 'Ethernet1/9',  type: 'ethernet', slot: 8 },
      { name: 'Ethernet1/10', type: 'ethernet', slot: 9 },
      { name: 'Ethernet1/11', type: 'ethernet', slot: 10 },
      { name: 'Ethernet1/12', type: 'ethernet', slot: 11 },
      { name: 'Ethernet1/13', type: 'ethernet', slot: 12 },
      { name: 'Ethernet1/14', type: 'ethernet', slot: 13 },
      { name: 'Ethernet1/15', type: 'ethernet', slot: 14 },
      { name: 'Ethernet1/16', type: 'ethernet', slot: 15 },
      { name: 'Ethernet1/17', type: 'ethernet', slot: 16 },
      { name: 'Ethernet1/18', type: 'ethernet', slot: 17 },
      { name: 'Ethernet1/19', type: 'ethernet', slot: 18 },
      { name: 'Ethernet1/20', type: 'ethernet', slot: 19 },
      { name: 'Ethernet1/21', type: 'ethernet', slot: 20 },
      { name: 'Ethernet1/22', type: 'ethernet', slot: 21 },
      { name: 'Ethernet1/23', type: 'ethernet', slot: 22 },
      { name: 'Ethernet1/24', type: 'ethernet', slot: 23 },
      { name: 'mgmt0', type: 'management', slot: 24 },
    ],
    config_parameters: [
      { name: 'hostname', type: 'string', required: true, description: 'Device hostname' },
      { name: 'feature_bgp', type: 'boolean', required: false, default: false, description: 'Enable BGP feature' },
      { name: 'feature_ospf', type: 'boolean', required: false, default: false, description: 'Enable OSPF feature' },
    ],
  },
  {
    vendor: 'juniper', os: 'junos', device_type: 'router',
    description: 'Juniper vMX Virtual Router',
    node_definition: 'vmx', default_ram: 4096, default_cpus: 2,
    interfaces: [
      { name: 'ge-0/0/0', type: 'ethernet', slot: 0 },
      { name: 'ge-0/0/1', type: 'ethernet', slot: 1 },
      { name: 'ge-0/0/2', type: 'ethernet', slot: 2 },
      { name: 'fxp0', type: 'management', slot: 3 },
    ],
    config_parameters: [
      { name: 'hostname', type: 'string', required: true, description: 'Device hostname' },
      { name: 'root_password', type: 'string', required: true, description: 'Root password' },
      { name: 'timezone', type: 'string', required: false, default: 'Asia/Tokyo', description: 'System timezone' },
    ],
  },
  {
    vendor: 'aruba', os: 'aos-cx', device_type: 'switch',
    description: 'Aruba AOS-CX Virtual Switch',
    node_definition: 'aruba_aoscx', default_ram: 2048, default_cpus: 1,
    interfaces: [
      { name: '1/1/1', type: 'ethernet', slot: 0 },
      { name: '1/1/2', type: 'ethernet', slot: 1 },
      { name: '1/1/3', type: 'ethernet', slot: 2 },
      { name: '1/1/4', type: 'ethernet', slot: 3 },
      { name: 'mgmt', type: 'management', slot: 4 },
    ],
    config_parameters: [
      { name: 'hostname', type: 'string', required: true, description: 'Device hostname' },
      { name: 'banner', type: 'string', required: false, description: 'Login banner message' },
      { name: 'ntp_server', type: 'string', required: false, description: 'NTP server address' },
    ],
  },
  {
    vendor: 'fortinet', os: 'fortios', device_type: 'firewall',
    description: 'Fortinet FortiGate Virtual Firewall',
    node_definition: 'fortinet', default_ram: 2048, default_cpus: 2,
    interfaces: [
      { name: 'port1', type: 'ethernet', slot: 0 },
      { name: 'port2', type: 'ethernet', slot: 1 },
      { name: 'port3', type: 'ethernet', slot: 2 },
      { name: 'mgmt', type: 'management', slot: 3 },
    ],
    config_parameters: [
      { name: 'hostname', type: 'string', required: true, description: 'Device hostname' },
      { name: 'admin_password', type: 'string', required: true, description: 'Admin password' },
      { name: 'timezone', type: 'integer', required: false, default: 60, description: 'Timezone (FortiOS timezone index)' },
    ],
  },
];

// テンプレートキー ("vendor/node_definition") → テンプレートの逆引きマップ
const TEMPLATE_MAP: Record<string, typeof MOCK_TEMPLATES[number]> = {};
for (const t of MOCK_TEMPLATES) {
  TEMPLATE_MAP[`${t.vendor}/${t.node_definition}`] = t;
  // "cisco/iosv_router" のような yaml 記述も受け付けるよう os 名でも登録
  TEMPLATE_MAP[`${t.vendor}/${t.os}_router`] = t;
  TEMPLATE_MAP[`${t.vendor}/${t.os}_switch`] = t;
  TEMPLATE_MAP[`${t.vendor}/${t.os}`] = t;
}
// example_topology.yaml の template 値 ("cisco/iosv_router" 等) を明示登録
TEMPLATE_MAP['cisco/iosv_router']    = MOCK_TEMPLATES[0];
TEMPLATE_MAP['cisco/nxosv_switch']   = MOCK_TEMPLATES[1];
TEMPLATE_MAP['juniper/junos_router'] = MOCK_TEMPLATES[2];
TEMPLATE_MAP['aruba/aos_cx_switch']  = MOCK_TEMPLATES[3];
TEMPLATE_MAP['fortinet/fortigate']   = MOCK_TEMPLATES[4];

// ─── シンプルな YAML パーサー（topology YAML 専用）─────────────────────────────

interface ParsedNode { id: string; template: string; label: string }
interface ParsedLink { source: string; source_interface: string; target: string; target_interface: string }

function parseTopologyYaml(yaml: string): { nodes: ParsedNode[]; links: ParsedLink[] } {
  const nodes: ParsedNode[] = [];
  const links: ParsedLink[] = [];
  let section: 'none' | 'nodes' | 'links' = 'none';
  let current: Record<string, string> = {};

  const flush = () => {
    if (section === 'nodes' && current.id) {
      nodes.push({ id: current.id, template: current.template ?? '', label: current.label?.replace(/^["']|["']$/g, '') ?? current.id });
    } else if (section === 'links' && current.source) {
      links.push({ source: current.source, source_interface: current.source_interface ?? '', target: current.target ?? '', target_interface: current.target_interface ?? '' });
    }
    current = {};
  };

  for (const rawLine of yaml.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;

    if (/^nodes\s*:/.test(line)) { flush(); section = 'nodes'; continue; }
    if (/^links\s*:/.test(line)) { flush(); section = 'links'; continue; }

    const listItem = line.match(/^\s*-\s+(\w[\w_-]*):\s*(.*)/);
    if (listItem) {
      flush();
      current[listItem[1]] = listItem[2].trim();
      continue;
    }
    const kv = line.match(/^\s+(\w[\w_-]*):\s*(.*)/);
    if (kv) {
      current[kv[1]] = kv[2].trim();
    }
  }
  flush();
  return { nodes, links };
}

// ─── 階層レイアウト生成 ───────────────────────────────────────────────────────

function buildLayout(parsedNodes: ParsedNode[], parsedLinks: ParsedLink[]) {
  const NODE_W = 200;
  const NODE_H = 160;

  // BFS で各ノードの階層（depth）を決定
  const targetSet = new Set(parsedLinks.map((l) => l.target));
  const roots = parsedNodes.filter((n) => !targetSet.has(n.id)).map((n) => n.id);
  const depths: Record<string, number> = {};
  const queue = roots.length > 0 ? [...roots] : [parsedNodes[0]?.id ?? ''];
  queue.forEach((id) => { depths[id] = 0; });

  const adj: Record<string, string[]> = {};
  for (const l of parsedLinks) {
    (adj[l.source] ??= []).push(l.target);
  }
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const next of (adj[cur] ?? [])) {
      if (depths[next] === undefined) {
        depths[next] = (depths[cur] ?? 0) + 1;
        queue.push(next);
      }
    }
  }
  // 未訪問ノードは depth=0
  for (const n of parsedNodes) {
    if (depths[n.id] === undefined) depths[n.id] = 0;
  }

  // depth ごとにノードを並べる
  const byDepth: Record<number, string[]> = {};
  for (const n of parsedNodes) {
    const d = depths[n.id];
    (byDepth[d] ??= []).push(n.id);
  }

  // 最大ノード数に合わせて水平間隔を動的に決定
  // リーフ数が多い場合（CLOSなど）は間隔を広げてエッジの重なりを軽減
  const maxNodesInRow = Math.max(...Object.values(byDepth).map((ids) => ids.length));
  const effectiveNodeW = Math.max(NODE_W, maxNodesInRow >= 8 ? 160 : NODE_W);
  const rowGap = maxNodesInRow >= 8 ? NODE_H * 2.5 : NODE_H * 1.4;

  const positions: Record<string, { x: number; y: number }> = {};
  for (const [depthStr, ids] of Object.entries(byDepth)) {
    const d = Number(depthStr);
    const totalWidth = ids.length * effectiveNodeW;
    ids.forEach((id, i) => {
      positions[id] = {
        x: i * effectiveNodeW - totalWidth / 2 + effectiveNodeW / 2,
        y: d * rowGap,
      };
    });
  }

  // ポート方向（接続先が上か下かで top/bottom を割り当て）
  const portDirs: Record<string, Record<string, string>> = {};
  for (const l of parsedLinks) {
    const srcDepth = depths[l.source] ?? 0;
    const dstDepth = depths[l.target] ?? 0;
    portDirs[l.source] ??= {};
    portDirs[l.target] ??= {};
    portDirs[l.source][l.source_interface] = dstDepth >= srcDepth ? 'bottom' : 'top';
    portDirs[l.target][l.target_interface] = srcDepth <= dstDepth ? 'top' : 'bottom';
  }

  // ReactFlow ノード生成
  const rfNodes = parsedNodes.map((n) => {
    const tmpl = TEMPLATE_MAP[n.template] ?? MOCK_TEMPLATES[0];
    return {
      id: n.id,
      type: 'deviceNode',
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: {
        label: n.label,
        template: tmpl,
        interfaces: {},
        portDirections: portDirs[n.id] ?? {},
      },
    };
  });

  // インターフェース名 → スロット番号の逆引き
  // テンプレートに存在しない場合は "Ethernet1/N" の N-1 をスロット番号として使う
  const getSlot = (nodeId: string, ifaceName: string): string => {
    const tmpl = TEMPLATE_MAP[parsedNodes.find((n) => n.id === nodeId)?.template ?? ''] ?? MOCK_TEMPLATES[0];
    const iface = tmpl.interfaces.find((i) => i.name === ifaceName);
    if (iface) return String(iface.slot);
    // "Ethernet1/N" 形式のフォールバック
    const m = ifaceName.match(/(\d+)$/);
    return m ? String(Number(m[1]) - 1) : '0';
  };

  // ReactFlow エッジ生成
  const rfEdges = parsedLinks.map((l, i) => ({
    id: `e${i}`,
    source: l.source,
    sourceHandle: getSlot(l.source, l.source_interface),
    target: l.target,
    targetHandle: getSlot(l.target, l.target_interface),
  }));

  return { nodes: rfNodes, edges: rfEdges };
}

// ─── モックプラグイン ──────────────────────────────────────────────────────────

function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? '';

        const sendJson = (status: number, body: unknown) => {
          const json = JSON.stringify(body);
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(json);
        };

        const readBody = (): Promise<string> =>
          new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk) => { data += chunk; });
            req.on('end', () => resolve(data));
          });

        // OPTIONS プリフライト
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.end();
          return;
        }

        // GET /api/v1/templates/
        if (req.method === 'GET' && url.startsWith('/api/v1/templates')) {
          sendJson(200, MOCK_TEMPLATES);
          return;
        }

        // GET /api/v1/topologies/
        if (req.method === 'GET' && url.startsWith('/api/v1/topologies')) {
          sendJson(200, []);
          return;
        }

        // POST /api/v1/topologies/yaml-layout
        if (req.method === 'POST' && url.startsWith('/api/v1/topologies/yaml-layout')) {
          readBody().then((body) => {
            try {
              const payload = JSON.parse(body || '{}');
              const yamlContent: string = payload.yaml_content ?? '';
              const { nodes: pNodes, links: pLinks } = parseTopologyYaml(yamlContent);
              const layout = buildLayout(pNodes, pLinks);
              sendJson(200, layout);
            } catch {
              sendJson(200, { nodes: [], edges: [] });
            }
          });
          return;
        }

        // POST /api/v1/topologies/
        if (req.method === 'POST' && url.startsWith('/api/v1/topologies')) {
          readBody().then((body) => {
            const payload = JSON.parse(body || '{}');
            sendJson(201, {
              id: `mock-${Date.now()}`,
              title: payload.title ?? '新規トポロジ',
              description: payload.description ?? '',
              state: null,
              node_count: 0,
            });
          });
          return;
        }

        // POST /api/v1/configs/generate
        if (req.method === 'POST' && url.startsWith('/api/v1/configs/generate')) {
          readBody().then((body) => {
            const payload = JSON.parse(body || '{}');
            const nodes: Array<{ node_id: string; label: string }> = payload.nodes ?? [];
            const configs = nodes.map((n) => ({
              node_id: n.node_id,
              label: n.label,
              config: `! Mock config for ${n.label}\nhostname ${n.label}\n`,
            }));
            sendJson(200, { configs });
          });
          return;
        }

        // POST /api/v1/configs/push-to-cml  (モックなので常に成功)
        if (req.method === 'POST' && url.startsWith('/api/v1/configs/push-to-cml')) {
          readBody().then(() => {
            sendJson(200, { lab_id: 'mock-lab-id', message: '[MOCK] CMLへの送信は無効です' });
          });
          return;
        }

        next();
      });
    },
  };
}

// ─── Vite 設定 ────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  server: {
    host: true,  // 0.0.0.0 にバインド（WSL → Windows アクセスに必要）
    port: 3000,
    // proxyは使わない（すべてモックミドルウェアで処理）
  },
});
