import assert from 'node:assert/strict';
import { captureRoutePointsSnapshot, applyRoutePointsSnapshot } from '../utils/route-points.js';
import { loadDiagramFromYaml } from './codegen-helpers.mjs';

const keyOf = (conn) => `${conn.from}:${Number(conn.fromIndex ?? 0)}->${conn.to}:${Number(conn.toIndex ?? 0)}`;

function cloneConnections(connections) {
  return connections.map((conn) => ({
    ...conn,
    points: (() => {
      let raw = conn.points;
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            raw = JSON.parse(trimmed);
          } catch {
            raw = undefined;
          }
        }
      }
      return Array.isArray(raw)
        ? raw.map((pt) => ({ x: Number(pt[0] ?? pt.x), y: Number(pt[1] ?? pt.y) }))
        : undefined;
    })(),
  }));
}

// Regression: preserve full route set across load/restore for large subsystem diagrams.
{
  const diagram = loadDiagramFromYaml('examples/beam.yaml');
  const conns = cloneConnections(diagram.connections);
  const snapshot = captureRoutePointsSnapshot(conns, keyOf);
  const reloaded = cloneConnections(diagram.connections).map((conn) => ({ ...conn, points: undefined }));
  const applied = applyRoutePointsSnapshot(reloaded, snapshot, keyOf);
  assert.equal(applied, conns.length, 'expected all beam routes to restore');
  for (let i = 0; i < conns.length; i += 1) {
    assert.deepEqual(
      reloaded[i].points,
      conns[i].points,
      `beam route mismatch at connection index ${i}`
    );
  }
}

// Regression: duplicate keys must restore distinct paths via per-key queues.
{
  const conns = [
    { from: 'a', to: 'b', fromIndex: 0, toIndex: 0, points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
    { from: 'a', to: 'b', fromIndex: 0, toIndex: 0, points: [{ x: 0, y: 10 }, { x: 10, y: 10 }] },
  ];
  const snapshot = captureRoutePointsSnapshot(conns, keyOf);
  const target = [
    { from: 'a', to: 'b', fromIndex: 0, toIndex: 0, points: undefined },
    { from: 'a', to: 'b', fromIndex: 0, toIndex: 0, points: undefined },
  ];
  const applied = applyRoutePointsSnapshot(target, snapshot, keyOf);
  assert.equal(applied, 2, 'expected both duplicate-key routes to restore');
  assert.deepEqual(target[0].points, conns[0].points, 'first duplicate-key route mismatch');
  assert.deepEqual(target[1].points, conns[1].points, 'second duplicate-key route mismatch');
}

console.log('route points snapshot tests passed');
