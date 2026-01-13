import assert from "assert/strict";
import { routeConnections2 } from "../router.js";
import { buildFallbackPath } from "../render.js";

function pathHasPoint(points, x, y) {
  return points.some((pt) => pt.x === x && pt.y === y);
}

function isAdjacent(points) {
  for (let i = 1; i < points.length; i += 1) {
    const dx = Math.abs(points[i].x - points[i - 1].x);
    const dy = Math.abs(points[i].y - points[i - 1].y);
    if (dx + dy !== 1) return false;
  }
  return true;
}

function hasImmediateBacktrack(points) {
  for (let i = 2; i < points.length; i += 1) {
    if (points[i].x === points[i - 2].x && points[i].y === points[i - 2].y) {
      return true;
    }
  }
  return false;
}

{
  const result = routeConnections2({
    nodes: [
      { id: "a", x: 0, y: 0, dir: "right" },
      { id: "b", x: 5, y: 0, dir: "left" },
    ],
    connections: [{ from: "a", to: "b" }],
    obstacles: [],
    settings: { maxTimeMs: 50 },
  });
  const wire = [...result.wires.values()][0];
  assert.equal(wire.points[0].x, 0);
  assert.equal(wire.points[0].y, 0);
  assert.equal(wire.points[wire.points.length - 1].x, 5);
  assert.equal(wire.points[wire.points.length - 1].y, 0);
  assert.ok(isAdjacent(wire.points));
}

{
  const result = routeConnections2({
    nodes: [
      { id: "a", x: 0, y: 0, dir: "right" },
      { id: "b", x: 4, y: 0, dir: "left" },
    ],
    connections: [{ from: "a", to: "b" }],
    obstacles: [{ x0: 2, y0: 0, x1: 2, y1: 0 }],
    settings: { maxTimeMs: 50 },
  });
  const wire = [...result.wires.values()][0];
  assert.ok(isAdjacent(wire.points));
  assert.ok(!pathHasPoint(wire.points, 2, 0));
}

{
  const result = routeConnections2({
    nodes: [
      { id: "a", x: 0, y: 0, dir: "right" },
      { id: "b", x: 4, y: 0, dir: "left" },
      { id: "c", x: 2, y: -2, dir: "down" },
      { id: "d", x: 2, y: 2, dir: "up" },
    ],
    connections: [
      { from: "a", to: "b", id: "ab" },
      { from: "c", to: "d", id: "cd" },
    ],
    obstacles: [],
    settings: { maxTimeMs: 100 },
  });
  const wire = result.wires.get("cd");
  assert.ok(wire, "second wire should route");
  assert.ok(isAdjacent(wire.points));
  assert.ok(pathHasPoint(wire.points, 2, 0));
}

{
  const result = routeConnections2({
    nodes: [
      { id: "n1", x: 5, y: 8, dir: "right" },
      { id: "n2", x: 14, y: 8, dir: "left" },
      { id: "n3", x: 7, y: 6, dir: "down" },
      { id: "n4", x: 7, y: 13, dir: "up" },
      { id: "n5", x: 11, y: 13, dir: "up" },
    ],
    connections: [
      { from: "n1", to: "n2", id: "n1->n2" },
      { from: "n3", to: "n4", id: "n3->n4" },
      { from: "n3", to: "n5", id: "n3->n5" },
    ],
    obstacles: [
      { x0: 8, y0: 10, x1: 8.001, y1: 10.001 },
      { x0: 9, y0: 10, x1: 9.001, y1: 10.001 },
      { x0: 9, y0: 11, x1: 9.001, y1: 11.001 },
      { x0: 9, y0: 12, x1: 9.001, y1: 12.001 },
      { x0: 9, y0: 13, x1: 9.001, y1: 13.001 },
      { x0: 9, y0: 14, x1: 9.001, y1: 14.001 },
      { x0: 10, y0: 15, x1: 10.001, y1: 15.001 },
      { x0: 9, y0: 16, x1: 9.001, y1: 16.001 },
      { x0: 9, y0: 15, x1: 9.001, y1: 15.001 },
      { x0: 9, y0: 9, x1: 9.001, y1: 9.001 },
    ],
    settings: { maxTimeMs: 200 },
  });
  const wire = result.wires.get("n3->n5");
  assert.ok(wire, "n3->n5 should route");
  assert.ok(!hasImmediateBacktrack(wire.points), "n3->n5 should not backtrack before hop");
}

{
  const from = { x: 92, y: 35 };
  const to = { x: 11, y: 48 };
  const path = buildFallbackPath(from, to);
  assert.ok(path.length >= 2, "expected at least two points");
  assert.deepEqual(path[0], from);
  assert.deepEqual(path[path.length - 1], to);
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    assert.ok(a.x === b.x || a.y === b.y, "fallback segment should be orthogonal");
  }
}

console.log("router tests passed");
