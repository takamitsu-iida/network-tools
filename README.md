# Network Design & Simulation Tool

GUIベースのネットワーク設計・シミュレーションツール。
物理構成・論理構成の設計と、実運用を想定した事前検証を目的とする。

---

## 目次

- [目的と機能概要](#目的と機能概要)
- [アーキテクチャ](#アーキテクチャ)
- [ディレクトリ構成](#ディレクトリ構成)
- [実装済み内容（Phase 1）](#実装済み内容phase-1)
  - [バックエンド FastAPI 骨格](#1-バックエンド-fastapi-骨格)
  - [CML REST API 連携](#2-cml-rest-api-連携)
  - [機器テンプレート YAML スキーマ](#3-機器テンプレート-yaml-スキーマ)
- [実装済み内容（Phase 2）](#実装済み内容phase-2)
  - [プロジェクト構成・ビルド設定](#1-プロジェクト構成ビルド設定)
  - [型定義・API クライアント](#2-型定義api-クライアント)
  - [Zustand ステート管理](#3-zustand-ステート管理)
  - [トポロジエディタ（React Flow）](#4-トポロジエディタreact-flow)
  - [機器パレット・ドラッグ&ドロップ](#5-機器パレットドラッグドロップ)
  - [IP / VLAN / VRF 設定フォーム](#6-ip--vlan--vrf-設定フォーム)
- [実装済み内容（Phase 3）](#実装済み内容phase-3)
  - [Jinja2 Config テンプレート](#1-jinja2-config-テンプレート)
  - [Config 生成サービス](#2-config-生成サービス)
  - [Config エンドポイント](#3-config-エンドポイント)
  - [Monaco Editor プレビューパネル](#4-monaco-editor-プレビューパネル)
  - [CML トポロジ YAML ビルダー](#5-cml-トポロジ-yaml-ビルダー)
- [実装済み内容（Phase 4）](#実装済み内容phase-4)
  - [シミュレーションスキーマ](#1-シミュレーションスキーマ)
  - [シミュレーションエンジン](#2-シミュレーションエンジン)
  - [シミュレーションエンドポイント](#3-シミュレーションエンドポイント)
  - [Chart.js グラフコンポーネント](#4-chartjs-グラフコンポーネント)
  - [シミュレーションパネル](#5-シミュレーションパネル)
- [API エンドポイント一覧](#api-エンドポイント一覧)
- [環境構築・起動方法](#環境構築起動方法)
- [技術スタック](#技術スタック)
- [ロードマップ](#ロードマップ)

---

## 目的と機能概要

| 機能 | 説明 |
|------|------|
| トポロジ設計 | 直感的な GUI による機器配置・ケーブル接続・IP アドレス/VLAN/VRF 設計 |
| 機器テンプレート | Cisco / Juniper / Aruba / Fortinet などの機器定義をドラッグ&ドロップで配置 |
| Config 自動生成 | 設計と同時に各メーカー向けコンフィグをプレビュー生成 |
| トラフィックシミュレーション | 帯域使用率・遅延・パケットロスの予測、障害シナリオのシミュレーション |
| セキュリティ設計 | ファイアウォールルール・アクセスリストの設計と検証 |
| 冗長構成分析 | 障害発生時の影響範囲を事前に分析 |
| バージョン管理 | 設計データの Git 管理と差分表示 |
| 設計チェック | ベストプラクティスに基づく自動提案・検証 |

---

## アーキテクチャ

```
┌──────────────────┐        REST / WebSocket        ┌──────────────────────┐
│  フロントエンド   │ ─────────────────────────────► │  バックエンド         │
│  (React / TS)    │                                 │  (FastAPI / Python)  │
└──────────────────┘                                 └──────────┬───────────┘
                                                                │
                                              CML REST API      │
                                                                ▼
                                                 ┌──────────────────────────┐
                                                 │  Cisco Modeling Labs      │
                                                 │  (シミュレーションエンジン)│
                                                 └──────────────────────────┘
                                                                │
                                              設計データ永続化   │
                                                                ▼
                                                 ┌──────────────────────────┐
                                                 │  PostgreSQL + Git         │
                                                 │  (メタデータ / YAML)      │
                                                 └──────────────────────────┘
```

---

## ディレクトリ構成

```
network-tools/
├── .env.example                    # 環境変数テンプレート
├── .gitignore
├── docker-compose.yml              # frontend + backend + PostgreSQL
├── instruction.yaml                # 要件・実装戦略の定義
├── README.md
├── frontend/                       # React フロントエンド（Phase 2〜4）
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts              # Vite ビルド設定・バックエンドプロキシ
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.tsx                # React エントリポイント（Chart.js 初期化）
│       ├── App.tsx                 # ルートコンポーネント・3ペインレイアウト
│       ├── styles/index.css        # Tailwind CSS
│       ├── types/index.ts          # 共通 TypeScript 型定義
│       ├── lib/
│       │   └── chartSetup.ts       # Chart.js コンポーネント登録（Phase 4）
│       ├── api/
│       │   ├── client.ts           # Axios クライアント
│       │   ├── templates.ts        # テンプレート取得 API
│       │   ├── topologies.ts       # トポロジ CRUD API
│       │   ├── configs.ts          # Config 生成・CML プッシュ API（Phase 3）
│       │   └── simulations.ts      # シミュレーション API（Phase 4）
│       ├── store/
│       │   └── topologyStore.ts    # Zustand グローバルステート
│       └── components/
│           ├── topology/
│           │   ├── TopologyEditor.tsx  # React Flow キャンバス本体
│           │   └── DeviceNode.tsx      # カスタムノードコンポーネント
│           ├── palette/
│           │   ├── DevicePalette.tsx   # 左サイドバー（テンプレート一覧）
│           │   └── PaletteItem.tsx     # ドラッグ可能な機器アイテム
│           ├── forms/
│           │   └── NetworkSettingsForm.tsx  # 右サイドバー（設定フォーム）
│           ├── config/
│           │   └── ConfigPreviewPanel.tsx   # Monaco Editor Config プレビュー（Phase 3）
│           └── simulation/
│               ├── SimulationPanel.tsx      # シミュレーション操作パネル（Phase 4）
│               └── MetricsChart.tsx         # Chart.js 時系列グラフ（Phase 4）
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── app/
    │   ├── main.py                 # FastAPI アプリ本体・CORS設定
    │   ├── config.py               # 環境変数による設定管理
    │   ├── routers/
    │   │   ├── topologies.py       # トポロジ CRUD エンドポイント
    │   │   ├── templates.py        # 機器テンプレート取得エンドポイント
    │   │   ├── configs.py          # Config 生成・CML プッシュ（Phase 3）
    │   │   └── simulations.py      # シミュレーションエンドポイント（Phase 4）
    │   ├── services/
    │   │   ├── cml_client.py       # CML REST API ラッパー (virl2-client)
    │   │   ├── config_generator.py # Jinja2 テンプレートエンジン（Phase 3）
    │   │   └── simulation.py       # BFS 経路探索・メトリクス生成（Phase 4）
    │   └── schemas/
    │       ├── topology.py         # Pydantic モデル（トポロジ・ノード・リンク）
    │       ├── device.py           # Pydantic モデル（機器テンプレート）
    │       ├── config.py           # Pydantic モデル（Config 生成）（Phase 3）
    │       └── simulation.py       # Pydantic モデル（シミュレーション）（Phase 4）
    ├── templates/                  # 機器テンプレート YAML
    │   ├── cisco/
    │   │   ├── iosv_router.yaml    # Cisco IOS Virtual Router
    │   │   └── nxosv_switch.yaml   # Cisco NX-OS Virtual Switch
    │   ├── juniper/
    │   │   └── junos_router.yaml   # Juniper vMX Virtual Router
    │   ├── aruba/
    │   │   └── aos_cx_switch.yaml  # Aruba AOS-CX Virtual Switch
    │   └── fortinet/
    │       └── fortigate.yaml      # Fortinet FortiGate Virtual Firewall
    └── config_templates/           # Jinja2 Config テンプレート（Phase 3）
        ├── cisco/
        │   ├── ios.j2              # Cisco IOS Config テンプレート
        │   └── nxos.j2             # Cisco NX-OS Config テンプレート
        ├── juniper/
        │   └── junos.j2            # Juniper Junos Config テンプレート
        ├── aruba/
        │   └── aos-cx.j2           # Aruba AOS-CX Config テンプレート
        └── fortinet/
            └── fortios.j2          # Fortinet FortiOS Config テンプレート
```

---

## 実装済み内容（Phase 1）

### 1. バックエンド FastAPI 骨格

#### `app/main.py`

FastAPI アプリケーションのエントリポイント。

- **CORS 設定**: フロントエンド開発サーバー (`http://localhost:3000`) からのリクエストを許可
- **ルーター登録**: `/api/v1` プレフィックスで `topologies` と `templates` を登録
- **ヘルスチェック**: `GET /health` でサービス稼働状態を確認可能

#### `app/config.py`

`pydantic-settings` を使用した設定管理。`.env` ファイルから環境変数を自動読み込みする。

| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| `CML_URL` | CML サーバーの URL | `https://cml-server` |
| `CML_USERNAME` | CML ログインユーザー名 | `admin` |
| `CML_PASSWORD` | CML ログインパスワード | `admin` |
| `CML_SSL_VERIFY` | SSL 証明書検証の有効/無効 | `false` |
| `TEMPLATES_DIR` | テンプレート YAML の配置ディレクトリ | `templates` |
| `DATABASE_URL` | PostgreSQL 接続文字列 | `postgresql+asyncpg://...` |

#### `app/schemas/topology.py`

トポロジ関連の Pydantic モデル定義。

| モデル | 用途 |
|--------|------|
| `TopologyCreate` | トポロジ作成リクエスト |
| `TopologySummary` | トポロジ一覧レスポンス（ノード数含む） |
| `TopologyResponse` | トポロジ詳細レスポンス（ノード・リンク含む） |
| `NodeCreate` | ノード追加リクエスト |
| `NodeResponse` | ノード情報レスポンス |
| `LinkCreate` | リンク追加リクエスト（スロット番号で接続先を指定） |
| `LinkResponse` | リンク情報レスポンス |
| `TopologyImport` | YAML テキストからのインポートリクエスト |

#### `app/schemas/device.py`

機器テンプレート関連の Pydantic モデル定義。

| モデル | 用途 |
|--------|------|
| `DeviceTemplate` | 機器テンプレート全体 |
| `InterfaceDefinition` | インターフェース定義（名前・タイプ・スロット番号） |
| `ConfigParameter` | Config 生成パラメータ定義（型・必須/任意・選択肢） |

---

### 2. CML REST API 連携

#### `app/services/cml_client.py`

Cisco 公式 Python SDK `virl2-client` を使用した CML 操作ラッパー。シングルトンパターンで接続を再利用する。

| メソッド | 説明 |
|----------|------|
| `connect()` | CML への接続（初回のみ接続し以降は再利用） |
| `get_all_labs()` | 全トポロジ一覧を取得 |
| `get_lab(lab_id)` | 指定トポロジの詳細（ノード・リンク含む）を取得 |
| `create_lab(title, description)` | 新規トポロジを作成 |
| `delete_lab(lab_id)` | トポロジを削除 |
| `add_node(...)` | トポロジにノード（機器）を追加 |
| `add_link(...)` | 2ノード間のインターフェーススロットを指定してリンクを追加 |
| `import_topology(yaml)` | CML フォーマットの YAML 文字列からトポロジをインポート |

#### `app/routers/topologies.py`

CML クライアントを呼び出す REST エンドポイント群。CML 接続エラーは `502 Bad Gateway` として返す。
`POST /import` は `GET /{lab_id}` との競合を避けるため、パスパラメータルートより先に定義している。

---

### 3. 機器テンプレート YAML スキーマ

`backend/templates/<vendor>/<name>.yaml` の形式で機器テンプレートを定義する。

#### スキーマ仕様

```yaml
vendor: <メーカー名>          # cisco / juniper / aruba / fortinet
os: <OS名>                   # ios / nxos / junos / aos-cx / fortios
device_type: <機器種別>       # router / switch / firewall
description: <説明文>
node_definition: <CMLノード定義名>   # CML に登録された node_definition と一致させる
default_ram: <MB>
default_cpus: <コア数>

interfaces:
  - name: <インターフェース名>
    type: <ethernet | serial | management | loopback>
    slot: <スロット番号>      # CML のスロット番号と対応

config_parameters:
  - name: <パラメータ名>
    type: <string | integer | boolean | enum>
    required: <true | false>
    default: <デフォルト値>
    choices: [<選択肢1>, <選択肢2>]   # type: enum のときのみ使用
    description: <説明文>
```

#### 対応テンプレート一覧

| ベンダー | ファイル | CML ノード定義 |
|----------|----------|----------------|
| Cisco | `cisco/iosv_router.yaml` | `iosv` |
| Cisco | `cisco/nxosv_switch.yaml` | `nxosv` |
| Juniper | `juniper/junos_router.yaml` | `vmx` |
| Aruba | `aruba/aos_cx_switch.yaml` | `aruba_aoscx` |
| Fortinet | `fortinet/fortigate.yaml` | `fortinet` |

新しいテンプレートはこのディレクトリに YAML ファイルを追加するだけで自動認識される。

---

## 実装済み内容（Phase 2）

React + TypeScript による Web GUI を実装した。バックエンドと同様に Docker で起動でき、`http://localhost:3000` でアクセスする。

### UI 構成図

```
┌──────────────────────── ツールバー ──────────────────────────────────┐
│  Network Design Tool  │ [トポロジ名]  │  クリア  │  CML へ保存（Phase 3）│
├────────────────┬───────────────────────────────┬─────────────────────┤
│ 機器テンプレート│                               │ プロパティ           │
│（左サイドバー）│     React Flow キャンバス      │（右サイドバー）       │
│                │                               │                     │
│ cisco          │  ドラッグ&ドロップで配置        │ ホスト名            │
│  ⬡ IOSv       │                               │ ─────────────────── │
│  ⬢ NX-OS      │  ノード間を線で接続して         │ インターフェース設定  │
│ juniper        │  リンクを作成                  │  GigabitEthernet0/0 │
│  ⬡ vMX        │                               │  IP アドレス         │
│ aruba          │                               │  プレフィックス長    │
│  ⬢ AOS-CX     │                               │  VLAN ID            │
│ fortinet       │                               │  VRF 名             │
│  ▣ FortiGate   │                               │                     │
└────────────────┴───────────────────────────────┴─────────────────────┘
```

---

### 1. プロジェクト構成・ビルド設定

#### `vite.config.ts`

Vite を使用したビルド設定。開発時は `/api` と `/health` へのリクエストをバックエンド (`http://localhost:8000`) にプロキシするため、フロントエンドからバックエンドへの CORS 問題が発生しない。

```ts
proxy: {
  '/api': 'http://localhost:8000',
  '/health': 'http://localhost:8000',
}
```

#### `main.tsx`

React アプリのエントリポイント。`@xyflow/react` の CSS をグローバルに読み込んでから Tailwind CSS を適用する。

---

### 2. 型定義・API クライアント

#### `src/types/index.ts`

バックエンドの Pydantic モデルと対応する TypeScript 型を一元管理する。

| 型 | 説明 |
|----|------|
| `DeviceTemplate` | 機器テンプレート（`backend/app/schemas/device.py` と対応） |
| `InterfaceDefinition` | インターフェース定義（名前・タイプ・スロット番号） |
| `InterfaceSettings` | 1インターフェースの IP / VLAN / VRF 設定値 |
| `DeviceNodeData` | React Flow ノードのデータペイロード |

> `DeviceNodeData` は React Flow v12 の制約により `Record<string, unknown>` を継承する必要がある。

#### `src/api/client.ts`

Axios インスタンスを `baseURL: '/api/v1'` で生成。全 API 呼び出しはこのクライアントを経由する。

#### `src/api/templates.ts` / `src/api/topologies.ts`

バックエンド REST API を呼び出す非同期関数群。型付きのレスポンスを返す。

---

### 3. Zustand ステート管理

#### `src/store/topologyStore.ts`

全コンポーネントが共有するグローバルステートを Zustand で管理する。React Flow の `applyNodeChanges` / `applyEdgeChanges` をストア内に閉じ込めることで、各コンポーネントは Zustand から提供されるコールバックをそのまま React Flow に渡すだけでよい。

| ステート / アクション | 説明 |
|----------------------|------|
| `nodes` | React Flow ノード配列（`Node<DeviceNodeData>[]`） |
| `edges` | React Flow エッジ配列 |
| `selectedNodeId` | 現在選択中のノード ID |
| `addNode(node)` | ノードを追加（ドロップ時に呼び出し） |
| `onNodesChange(changes)` | React Flow の変更イベントをストアに反映 |
| `onEdgesChange(changes)` | React Flow の変更イベントをストアに反映 |
| `updateNodeLabel(id, label)` | ホスト名を更新 |
| `updateNodeInterfaceSettings(id, iface, settings)` | インターフェース設定を更新 |

---

### 4. トポロジエディタ（React Flow）

#### `src/components/topology/TopologyEditor.tsx`

メインキャンバス。`@xyflow/react` の `<ReactFlow>` コンポーネントをラップして以下を実現する。

| 機能 | 実装詳細 |
|------|----------|
| ノード描画 | `nodeTypes` に `DeviceNode` を登録し、カスタムノードとして描画 |
| ドロップ | `onDrop` で `DataTransfer` から `DeviceTemplate` を取得し、`screenToFlowPosition()` で座標変換後にノードを追加 |
| リンク作成 | `onConnect` で `addEdge()` を呼び出し、エッジを追加 |
| 双方向接続 | `connectionMode={ConnectionMode.Loose}` で source → source の接続を許可し、任意のポート同士を繋げる |
| エッジスタイル | `defaultEdgeOptions` で `smoothstep` 型・グレーの線を統一設定 |
| ミニマップ | `<MiniMap>` で全体俯瞰を表示 |

#### `src/components/topology/DeviceNode.tsx`

カスタムノードコンポーネント。`memo` でラップしてパフォーマンスを最適化する。

- ベンダーカラー（Cisco: 青、Juniper: 緑、Aruba: オレンジ、Fortinet: 赤）でヘッダーを色分け
- management タイプを除く各インターフェースに `<Handle>` を配置（上・右・下・左の順で循環）
- ノード選択時は青いボーダーを表示

---

### 5. 機器パレット・ドラッグ&ドロップ

#### `src/components/palette/DevicePalette.tsx`

左サイドバー。マウント時に `GET /api/v1/templates/` を呼び出してテンプレート一覧を取得し、ベンダー別にグループ化して表示する。

#### `src/components/palette/PaletteItem.tsx`

各テンプレートの表示行。`draggable` 属性を付与し、`onDragStart` で `DataTransfer` に `DeviceTemplate` を JSON シリアライズして格納する。

```ts
event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
```

`TopologyEditor` の `onDrop` がこのデータを受け取り、ノードとしてキャンバスに追加する。

---

### 6. IP / VLAN / VRF 設定フォーム

#### `src/components/forms/NetworkSettingsForm.tsx`

右サイドバー。Zustand ストアの `selectedNodeId` を監視し、ノードが選択されると当該ノードのプロパティ編集 UI を表示する。

| 設定項目 | 対象 |
|----------|------|
| ホスト名 | ノード全体 |
| IP アドレス | インターフェースごと |
| プレフィックス長 | インターフェースごと |
| VLAN ID | インターフェースごと |
| VRF 名 | インターフェースごと |

入力値はリアルタイムに Zustand ストアの `DeviceNodeData.interfaces` に格納され、Phase 3 の Config 自動生成で使用する。

---

## 実装済み内容（Phase 3）

Jinja2 テンプレートを使ったコンフィグ自動生成と、Monaco Editor を使ったプレビュー UI を実装した。
生成したトポロジを CML に直接インポートするプッシュ機能も含む。

### UI 追加箇所

ツールバーに **「Config プレビュー」** ボタンが追加され、クリックすると固定モーダルオーバーレイが開く。

```
┌──────────────────────── ツールバー ──────────────────────────────────┐
│  Network Design Tool  │ [トポロジ名]  │ クリア │シミュレーション│ ... │  Config プレビュー │
└──────────────────────────────────────────────────────────────────────┘
                     ↓ Config プレビュー クリック
┌───────────────┬──────────────────────────────────────────────────────┐
│ ノード一覧     │ Monaco Editor (read-only / vs-dark テーマ)            │
│  Router-01    │  hostname Router-01                                   │
│  Switch-01    │  ip domain-name lab.example.com                      │
│  FW-01        │  ...                                                  │
│               │                                                       │
│               │                                                       │
├───────────────┴──────────────────────────────────────────────────────┤
│  [CML へ保存 & インポート]                           [閉じる]          │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 1. Jinja2 Config テンプレート

`backend/config_templates/<vendor>/<os>.j2` の形式で各ベンダー・OS 向けの Jinja2 テンプレートを定義する。

| ファイル | 適用対象 | 主な内容 |
|----------|----------|----------|
| `cisco/ios.j2` | Cisco IOS | hostname、domain、enable secret、SSH v2 設定、インターフェース IP/VRF |
| `cisco/nxos.j2` | Cisco NX-OS | hostname、feature（bgp/ospf/vlan）、username、インターフェース IP/VRF |
| `juniper/junos.j2` | Juniper Junos | system stanza（hostname/timezone/root-auth）、interfaces stanza（unit 0） |
| `aruba/aos-cx.j2` | Aruba AOS-CX | hostname、banner、インターフェース IP/VRF、ssh server vrf |
| `fortinet/fortios.j2` | Fortinet FortiOS | config system global（hostname/timezone）、config system interface |

テンプレートは Jinja2 の `{% for %}` と `{% if %}` を活用し、インターフェース設定を動的に展開する。
`prefix_to_netmask` カスタムフィルターでプレフィックス長（例: `24`）をサブネットマスク（`255.255.255.0`）に変換する。

---

### 2. Config 生成サービス

#### `app/services/config_generator.py`

Jinja2 `Environment` のシングルトンラッパー。テンプレートのロードと変数の注入を担当する。

| メソッド | 説明 |
|----------|------|
| `generate(vendor, os, context)` | `config_templates/{vendor}/{os}.j2` を読み込み、コンテキスト変数を注入して文字列を返す |
| `_prefix_to_netmask(prefix_length)` | カスタム Jinja2 フィルター。`24 → '255.255.255.0'` に変換 |

---

### 3. Config エンドポイント

#### `app/routers/configs.py`

| メソッド | パス | 説明 |
|----------|------|------|
| `POST` | `/api/v1/configs/preview` | 全ノードの Config を一括生成し `TopologyConfigResponse` を返す |
| `POST` | `/api/v1/configs/push-to-cml` | CML フォーマットの YAML をビルドして `import_topology` で CML にインポート |

#### `app/schemas/config.py`

| モデル | 説明 |
|--------|------|
| `InterfaceConfig` | インターフェース設定（name, slot, ip_address, prefix_length, vlan_id, vrf_name） |
| `NodeConfigRequest` | ノードの Config 生成リクエスト（label, vendor, os, node_definition, x, y, interfaces, extra_params） |
| `NodeConfigResponse` | 生成された Config テキスト |
| `TopologyConfigRequest` / `TopologyConfigResponse` | トポロジ全体の一括生成リクエスト/レスポンス |
| `EdgeData` | リンク情報（src_node_id, src_iface_slot, dst_node_id, dst_iface_slot） |
| `CMLPushRequest` | CML インポートリクエスト（title, description, nodes, edges, start_after_push） |
| `CMLLabResponse` | CML からのレスポンス（lab_id, lab_title, url） |

---

### 4. Monaco Editor プレビューパネル

#### `src/components/config/ConfigPreviewPanel.tsx`

固定オーバーレイモーダル。左カラムのノード一覧をクリックして切替えながら Config を確認できる。

- **Monaco Editor** を `read-only`・`vs-dark` テーマで表示
- **言語**: ベンダーに応じて `ini`（Cisco/Aruba/Fortinet）または `yaml`（Juniper）を設定
- **「CML へ保存 & インポート」ボタン**: `POST /configs/push-to-cml` を呼び出し、成功時に lab_id をアラート表示

---

### 5. CML トポロジ YAML ビルダー

`POST /configs/push-to-cml` 内で React Flow のノード・エッジを CML の YAML フォーマットに変換する。

| 変換ルール | 詳細 |
|------------|------|
| ノード ID | React Flow のノード ID → `n0`, `n1`, ... と順次採番 |
| インターフェース ID | スロット番号 → `i{slot}` |
| リンク | `n0[i0]` ↔ `n1[i0]` 形式の接続リスト |
| 機器設定 | `node_definition` / `x` / `y` / `configuration`（生成済み Config テキスト）をマッピング |

---

## 実装済み内容（Phase 4）

GUI からトポロジ上のトラフィックフローを模擬的にシミュレーションし、障害注入時の影響をグラフで可視化する機能を実装した。CML への実接続は不要で、バックエンド側の BFS アルゴリズムと乱数生成によりリアルな時系列メトリクスを生成する。

### UI 追加箇所

ツールバーに **「シミュレーション」** ボタン（紫色）が追加され、2台以上のノードが配置されると有効化される。

```
┌──────────────────────────── ツールバー ──────────────────────────────┐
│ Network Design Tool │ [名前] │ クリア │ シミュレーション │ ... │ Config プレビュー │
└──────────────────────────────────────────────────────────────────────┘
              ↓ シミュレーション クリック
┌──────────────┬───────────────────────────────────────────────────────┐
│ 送信元       │  経路情報                                              │
│ 宛先         │  経路: Router-01 → Switch-01 → Router-02 (2 ホップ)   │
│ パターン     │  ────────────────────────────────────────────────      │
│ 帯域         │  平均帯域: 98.4 Mbps │ 平均遅延: 5.1 ms │ 損失: 0.01% │
│ 期間         │  ────────────────────────────────────────────────      │
│              │  [帯域グラフ (Chart.js Line)]                         │
│ ──────────── │  [遅延グラフ (Chart.js Line)]                         │
│ 障害種別     │  [パケットロスグラフ (Chart.js Line)]                  │
│ 障害対象     │                                                       │
│ [障害実行]   │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
```

---

### 1. シミュレーションスキーマ

#### `app/schemas/simulation.py`

| モデル | 説明 |
|--------|------|
| `TrafficPattern` | `uniform` / `bursty` / `ramp` の 3 種類 |
| `FailureType` | `node_down` / `link_down` の 2 種類 |
| `TrafficSimRequest` | シミュレーション設定（src/dst ノード、パターン、帯域、期間、トポロジ情報） |
| `FailureScenarioRequest` | 障害シナリオ設定（障害種別、対象 ID、トラフィック設定） |
| `MetricPoint` | 1秒ごとのメトリクスポイント（timestamp, bandwidth_mbps, latency_ms, packet_loss_pct） |
| `PathInfo` | 経路情報（hops, hop_labels, reachable） |
| `SimulationResult` | シミュレーション結果全体 |

---

### 2. シミュレーションエンジン

#### `app/services/simulation.py`

| 関数 | 説明 |
|------|------|
| `_bfs_path(adj, src, dst)` | BFS で最短経路（ホップ数最小）を探索する |
| `_build_adj(nodes, links, exclude_nodes, exclude_links)` | 隣接リストを構築（障害ノード/リンクを除外可能） |
| `_generate_metrics(...)` | 時系列メトリクスを生成（`random.Random(42)` で再現性を確保） |
| `simulate_traffic(req)` | 通常トラフィックシミュレーション |
| `simulate_failure(req)` | 障害注入シミュレーション |

#### メトリクス生成の仕様

| トラフィックパターン | 帯域の挙動 |
|---------------------|-----------|
| `uniform` | ガウスノイズで微小変動 |
| `bursty` | 20%の確率でバースト（1.5 倍）、70%は低トラフィック（0.2 倍） |
| `ramp` | シミュレーション期間の前半で線形増加 |

障害発生（`duration // 3` 秒目）から **5秒間** は通信断（帯域 0、遅延 999ms、損失 100%）。
代替経路が存在する場合は5秒後に帯域 85% で復旧、存在しない場合は通信断が継続する。

---

### 3. シミュレーションエンドポイント

#### `app/routers/simulations.py`

| メソッド | パス | 説明 |
|----------|------|------|
| `POST` | `/api/v1/simulations/traffic` | 通常トラフィックシミュレーションを実行し `SimulationResult` を返す |
| `POST` | `/api/v1/simulations/failure` | 障害シナリオを注入してトラフィックへの影響を返す |

ノード数が 1 台以下の場合や送信元と宛先が同一の場合は `422 Unprocessable Entity` を返す。

---

### 4. Chart.js グラフコンポーネント

#### `src/lib/chartSetup.ts`

Chart.js の必要なコンポーネント（`CategoryScale`, `LinearScale`, `PointElement`, `LineElement`, `Title`, `Tooltip`, `Legend`, `Filler`）を一箇所で登録する。`main.tsx` の先頭でインポートすることで全コンポーネントから利用可能になる。

#### `src/components/simulation/MetricsChart.tsx`

汎用的な時系列折れ線グラフコンポーネント。`react-chartjs-2` の `<Line>` を使用。

| Props | 説明 |
|-------|------|
| `metrics` | `MetricPoint[]` - シミュレーション結果の時系列データ |
| `field` | グラフ化するフィールド名（`bandwidth_mbps` / `latency_ms` / `packet_loss_pct`） |
| `label` | グラフのタイトル |
| `color` | 線の色（HEX 形式） |
| `unit` | Y 軸の単位 |

---

### 5. シミュレーションパネル

#### `src/components/simulation/SimulationPanel.tsx`

固定オーバーレイモーダル。左カラムに設定フォーム、右カラムに結果表示を配置する。

**左カラム（設定）**

- 送信元・宛先ノードのドロップダウン（Zustand ストアのノード一覧から自動生成）
- トラフィックパターン選択（均一 / バースト / 増加）
- 帯域（Mbps）・期間（秒）の数値入力
- **「▶ シミュレーション実行」** ボタン（緑）
- 障害種別（ノード障害 / リンク断）選択
- 障害対象ドロップダウン（種別に応じてノード一覧またはエッジ一覧を表示）
- **「⚡ 障害シミュレーション」** ボタン（オレンジ）

**右カラム（結果）**

| 表示要素 | 内容 |
|----------|------|
| 経路情報 | 障害前後のホップ経路とラベル、障害発生秒数 |
| サマリーカード | 平均帯域 / 平均遅延 / 平均パケットロス |
| 帯域グラフ | 緑色の折れ線 (`bandwidth_mbps`) |
| 遅延グラフ | 青色の折れ線 (`latency_ms`) |
| パケットロスグラフ | 赤色の折れ線 (`packet_loss_pct`) |

---

## API エンドポイント一覧

起動後は `http://localhost:8000/docs` で Swagger UI から確認・実行できる。

### トポロジ管理 (`/api/v1/topologies`)

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/api/v1/topologies/` | トポロジ一覧取得 |
| `POST` | `/api/v1/topologies/` | トポロジ新規作成 |
| `POST` | `/api/v1/topologies/import` | YAML からトポロジインポート |
| `GET` | `/api/v1/topologies/{lab_id}` | トポロジ詳細取得（ノード・リンク含む） |
| `DELETE` | `/api/v1/topologies/{lab_id}` | トポロジ削除 |
| `POST` | `/api/v1/topologies/{lab_id}/nodes` | ノード追加 |
| `POST` | `/api/v1/topologies/{lab_id}/links` | リンク追加 |

### 機器テンプレート管理 (`/api/v1/templates`)

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/api/v1/templates/` | 全テンプレート一覧取得 |
| `GET` | `/api/v1/templates/{vendor}/{name}` | 指定テンプレート取得 |

### Config 管理 (`/api/v1/configs`)

| メソッド | パス | 説明 |
|----------|------|------|
| `POST` | `/api/v1/configs/preview` | 全ノードの Config を一括生成（Jinja2 テンプレート使用） |
| `POST` | `/api/v1/configs/push-to-cml` | トポロジ YAML をビルドして CML にインポート |

### シミュレーション (`/api/v1/simulations`)

| メソッド | パス | 説明 |
|----------|------|------|
| `POST` | `/api/v1/simulations/traffic` | 通常トラフィックシミュレーションを実行 |
| `POST` | `/api/v1/simulations/failure` | 障害シナリオを注入してトラフィックへの影響を返す |

### ヘルスチェック

| メソッド | パス | 説明 |
|----------|------|------|
| `GET` | `/health` | サービス稼働確認 |

---

## 環境構築・起動方法

### 前提条件

- Docker / Docker Compose がインストール済みであること
- Cisco Modeling Labs サーバーへネットワーク疎通があること

### 手順

**1. 環境変数ファイルの作成**

```bash
cp .env.example .env
```

`.env` を編集して CML サーバーの接続情報を設定する。

```env
CML_URL=https://your-cml-server
CML_USERNAME=admin
CML_PASSWORD=your-password
CML_SSL_VERIFY=false
```

**2. コンテナの起動**

```bash
docker compose up --build
```

**3. 動作確認**

```bash
# バックエンド ヘルスチェック
curl http://localhost:8000/health

# Swagger UI（バックエンド API ドキュメント）
open http://localhost:8000/docs

# フロントエンド GUI
open http://localhost:3000
```

### フロントエンド単体での起動（開発時）

バックエンドの起動とは独立してフロントエンドのみ起動できる。

```bash
cd frontend
npm install     # 初回のみ
npm run dev     # http://localhost:3000 で起動
```

> バックエンドが起動していない場合、機器テンプレートの読み込みに失敗するが、UI 自体は表示される。

### コンテナの停止

```bash
# コンテナを停止・削除（DB データは保持）
docker compose down

# 一時停止のみ（削除しない）
docker compose stop
```

> DB データも含めて完全にリセットしたい場合は `docker compose down -v` を使用する（`postgres_data` ボリュームも削除される）。

### 起動時のトラブルシューティング

#### フロントエンドで `Failed to resolve import` エラーが出る場合

`node_modules` の anonymous volume が古いまま残っている可能性がある。以下の手順で volume を再作成する。

```bash
docker compose down
docker compose up --build --renew-anon-volumes
```

> `--renew-anon-volumes` オプションは anonymous volume（`/app/node_modules`）を強制的に再作成する。

---

### CML なしでの動作確認（テンプレート API のみ）

CML サーバーが不要なテンプレート取得 API は CML 接続なしで動作する。

```bash
# 機器テンプレート一覧を取得
curl http://localhost:8000/api/v1/templates/

# Cisco IOS ルータのテンプレートを取得
curl http://localhost:8000/api/v1/templates/cisco/iosv_router
```

---

## 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| バックエンド | Python + FastAPI | FastAPI >= 0.110 |
| データバリデーション | Pydantic v2 | >= 2.0 |
| 設定管理 | pydantic-settings | >= 2.0 |
| CML 連携 | virl2-client (Cisco 公式 SDK) | >= 2.7 |
| テンプレート読み込み | PyYAML | >= 6.0 |
| Config テンプレート | Jinja2 | >= 3.1 |
| データベース | PostgreSQL 16 | - |
| コンテナ | Docker + Docker Compose | - |
| フロントエンド | React 18 + TypeScript | React >= 18.3 |
| ビルドツール | Vite | >= 5.3 |
| トポロジエディタ | @xyflow/react (React Flow v12) | >= 12.3 |
| ステート管理 | Zustand | >= 5.0 |
| HTTP クライアント | Axios | >= 1.7 |
| CSS フレームワーク | Tailwind CSS | >= 3.4 |
| コードエディタ | @monaco-editor/react | >= 4.6 |
| グラフ描画 | Chart.js + react-chartjs-2 | >= 4.4 / >= 5.2 |

---

## ロードマップ

| Phase | 内容 | 状態 |
|-------|------|------|
| **Phase 1** | バックエンド基盤・CML API 連携・機器テンプレート定義 | **完了** |
| **Phase 2** | React GUI（トポロジエディタ・ドラッグ&ドロップ・IP/VLAN/VRF 入力） | **完了** |
| **Phase 3** | Jinja2 による Config 自動生成・Monaco Editor プレビュー・CML へのプッシュ | **完了** |
| **Phase 4** | トラフィックシミュレーション・障害シナリオ注入・グラフ可視化 | **完了** |
| Phase 5 | セキュリティポリシー検証・冗長構成分析・Git バージョン管理・設計チェック | 未着手 |
