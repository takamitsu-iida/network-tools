import random
import uuid
from collections import defaultdict, deque

from app.schemas.simulation import (
    FailureScenarioRequest,
    FailureType,
    MetricPoint,
    PathInfo,
    SimulationResult,
    TrafficPattern,
    TrafficSimRequest,
)


def _bfs_path(adj: dict, src: str, dst: str) -> list[str]:
    """BFS で最短経路（ホップ数最小）を探索する"""
    if src == dst:
        return [src]
    visited: set[str] = {src}
    queue: deque[list[str]] = deque([[src]])
    while queue:
        path = queue.popleft()
        for neighbor in adj.get(path[-1], []):
            if neighbor in visited:
                continue
            new_path = path + [neighbor]
            if neighbor == dst:
                return new_path
            visited.add(neighbor)
            queue.append(new_path)
    return []


def _build_adj(
    nodes: list,
    links: list,
    exclude_nodes: set[str] | None = None,
    exclude_links: set[str] | None = None,
) -> dict:
    excl_n = exclude_nodes or set()
    excl_l = exclude_links or set()
    adj: dict[str, list[str]] = defaultdict(list)
    for link in links:
        s, d = link.src_node_id, link.dst_node_id
        if s in excl_n or d in excl_n:
            continue
        if f"{s}:{d}" in excl_l or f"{d}:{s}" in excl_l:
            continue
        adj[s].append(d)
        adj[d].append(s)
    return adj


def _generate_metrics(
    pattern: TrafficPattern,
    bandwidth_mbps: float,
    hop_count: int,
    duration: int,
    failure_start: int | None = None,
    path_after_hops: int = 0,
    has_alternate: bool = True,
) -> list[MetricPoint]:
    """時系列メトリクスを生成する（決定的な乱数シードを使用）"""
    rng = random.Random(42)
    base_latency = max(1.0, hop_count * 2.5)  # 1 ホップあたり 2.5ms
    recovery_window = 5                         # 障害直後の通信断期間（秒）
    points: list[MetricPoint] = []

    for t in range(duration):
        in_recovery = (
            failure_start is not None
            and failure_start <= t < failure_start + recovery_window
        )
        post_failure = (
            failure_start is not None
            and t >= failure_start + recovery_window
        )

        # ── 帯域 ──────────────────────────────────────────────────
        if pattern == TrafficPattern.BURSTY:
            burst = rng.choices([0.2, 1.5], weights=[0.7, 0.3])[0]
            bw = bandwidth_mbps * burst * (1 + rng.gauss(0, 0.1))
        elif pattern == TrafficPattern.RAMP:
            ramp = min(1.0, t / max(1, duration * 0.5))
            bw = bandwidth_mbps * ramp * (1 + rng.gauss(0, 0.05))
        else:  # uniform
            bw = bandwidth_mbps * (1 + rng.gauss(0, 0.05))

        latency = base_latency + rng.gauss(0, 0.3)
        loss = max(0.0, rng.gauss(0.01, 0.02))

        # ── 障害適用 ───────────────────────────────────────────────
        if in_recovery:
            bw, latency, loss = 0.0, 999.0, 100.0
        elif post_failure:
            if has_alternate:
                extra_hops = max(0, path_after_hops - hop_count)
                latency = base_latency + extra_hops * 3.0 + rng.gauss(0, 0.5)
                bw = bw * 0.85
                loss = max(0.0, rng.gauss(0.05, 0.03))
            else:
                bw, latency, loss = 0.0, 999.0, 100.0

        points.append(
            MetricPoint(
                timestamp=t,
                bandwidth_mbps=round(max(0.0, bw), 2),
                latency_ms=round(max(0.0, latency), 2),
                packet_loss_pct=round(min(100.0, max(0.0, loss)), 4),
            )
        )
    return points


def simulate_traffic(req: TrafficSimRequest) -> SimulationResult:
    sim_id = uuid.uuid4().hex[:8]
    labels = {n.node_id: n.label for n in req.nodes}
    adj = _build_adj(req.nodes, req.links)
    hops = _bfs_path(adj, req.src_node_id, req.dst_node_id)

    path_before = PathInfo(
        hops=hops,
        hop_labels=[labels.get(n, n) for n in hops],
        reachable=bool(hops),
    )
    metrics = _generate_metrics(
        pattern=req.traffic_pattern,
        bandwidth_mbps=req.bandwidth_mbps,
        hop_count=len(hops) - 1 if hops else 0,
        duration=req.duration_sec,
    )
    valid = [m for m in metrics if m.bandwidth_mbps > 0]
    return SimulationResult(
        sim_id=sim_id,
        status="completed",
        src_label=labels.get(req.src_node_id, req.src_node_id),
        dst_label=labels.get(req.dst_node_id, req.dst_node_id),
        metrics=metrics,
        path_before=path_before,
        summary={
            "avg_bandwidth_mbps": round(sum(m.bandwidth_mbps for m in valid) / len(valid), 2) if valid else 0.0,
            "avg_latency_ms": round(sum(m.latency_ms for m in valid) / len(valid), 2) if valid else 0.0,
            "avg_packet_loss_pct": round(sum(m.packet_loss_pct for m in metrics) / len(metrics), 4) if metrics else 0.0,
            "hop_count": len(hops) - 1 if hops else 0,
            "reachable": path_before.reachable,
        },
    )


def simulate_failure(req: FailureScenarioRequest) -> SimulationResult:
    sim_id = uuid.uuid4().hex[:8]
    traffic = req.traffic_sim
    labels = {n.node_id: n.label for n in traffic.nodes}

    # 障害前の経路
    adj_before = _build_adj(traffic.nodes, traffic.links)
    hops_before = _bfs_path(adj_before, traffic.src_node_id, traffic.dst_node_id)
    path_before = PathInfo(
        hops=hops_before,
        hop_labels=[labels.get(n, n) for n in hops_before],
        reachable=bool(hops_before),
    )

    # 障害後の経路
    excl_nodes: set[str] = set()
    excl_links: set[str] = set()
    if req.failure_type == FailureType.NODE_DOWN:
        excl_nodes = {req.target_id}
    else:
        excl_links = {req.target_id}

    adj_after = _build_adj(traffic.nodes, traffic.links, excl_nodes, excl_links)
    hops_after = _bfs_path(adj_after, traffic.src_node_id, traffic.dst_node_id)
    path_after = PathInfo(
        hops=hops_after,
        hop_labels=[labels.get(n, n) for n in hops_after],
        reachable=bool(hops_after),
    )

    failure_start = traffic.duration_sec // 3
    metrics = _generate_metrics(
        pattern=traffic.traffic_pattern,
        bandwidth_mbps=traffic.bandwidth_mbps,
        hop_count=len(hops_before) - 1 if hops_before else 0,
        duration=traffic.duration_sec,
        failure_start=failure_start,
        path_after_hops=len(hops_after) - 1 if hops_after else 0,
        has_alternate=path_after.reachable,
    )
    valid = [m for m in metrics if m.bandwidth_mbps > 0]
    return SimulationResult(
        sim_id=sim_id,
        status="completed",
        src_label=labels.get(traffic.src_node_id, traffic.src_node_id),
        dst_label=labels.get(traffic.dst_node_id, traffic.dst_node_id),
        metrics=metrics,
        path_before=path_before,
        path_after=path_after,
        failure_applied=True,
        failure_type=req.failure_type.value,
        failure_target=req.target_id,
        summary={
            "avg_bandwidth_mbps": round(sum(m.bandwidth_mbps for m in valid) / len(valid), 2) if valid else 0.0,
            "avg_latency_ms": round(sum(m.latency_ms for m in valid) / len(valid), 2) if valid else 0.0,
            "avg_packet_loss_pct": round(sum(m.packet_loss_pct for m in metrics) / len(metrics), 4) if metrics else 0.0,
            "reachable_before": path_before.reachable,
            "reachable_after": path_after.reachable,
            "alternate_path_found": path_after.reachable,
            "failure_type": req.failure_type.value,
            "failure_start_sec": failure_start,
        },
    )
