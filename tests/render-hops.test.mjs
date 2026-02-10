import assert from "node:assert/strict";
import { buildPathWithHops } from "../render.js";
import { loadDiagramFromYaml } from "./codegen-helpers.mjs";

function hSeg(x0, x1, y) {
  return {
    orientation: "H",
    a: { x: x0, y },
    b: { x: x1, y },
    minX: Math.min(x0, x1),
    maxX: Math.max(x0, x1),
    y,
    isStub: false,
  };
}

function vSeg(x, y0, y1) {
  return {
    orientation: "V",
    a: { x, y: y0 },
    b: { x, y: y1 },
    minY: Math.min(y0, y1),
    maxY: Math.max(y0, y1),
    x,
    isStub: false,
  };
}

function parsePoints(value) {
  if (Array.isArray(value)) {
    return value
      .map((pt) => {
        if (Array.isArray(pt) && pt.length >= 2) return { x: Number(pt[0]), y: Number(pt[1]) };
        if (pt && typeof pt === "object") return { x: Number(pt.x), y: Number(pt.y) };
        return null;
      })
      .filter((pt) => pt && Number.isFinite(pt.x) && Number.isFinite(pt.y));
  }
  if (typeof value === "string") {
    const matches = [...value.matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)];
    return matches.map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
  }
  return [];
}

function buildSegs(points) {
  const segs = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a.x === b.x) {
      segs.push({
        orientation: "V",
        a,
        b,
        minY: Math.min(a.y, b.y),
        maxY: Math.max(a.y, b.y),
        x: a.x,
        isStub: false,
      });
    } else if (a.y === b.y) {
      segs.push({
        orientation: "H",
        a,
        b,
        minX: Math.min(a.x, b.x),
        maxX: Math.max(a.x, b.x),
        y: a.y,
        isStub: false,
      });
    }
  }
  return segs;
}

function collectHopCenters(pathD) {
  const hopCenters = [];
  const re = /L\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)\s*a\s*\d+(?:\.\d+)?\s*\d+(?:\.\d+)?\s*0\s*0\s*1\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g;
  for (const m of pathD.matchAll(re)) {
    const sx = Number(m[1]);
    const sy = Number(m[2]);
    const dx = Number(m[3]);
    const dy = Number(m[4]);
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(dx) || !Number.isFinite(dy)) continue;
    const cx = Math.round(sx + dx / 2);
    const cy = Math.round(sy + dy / 2);
    const orient = Math.abs(dx) >= Math.abs(dy) ? "H" : "V";
    hopCenters.push({ key: `${cx},${cy}`, orient });
  }
  return hopCenters;
}

function collectHopArcs(pathD) {
  const arcs = [];
  const re = /a\s*\d+(?:\.\d+)?\s*\d+(?:\.\d+)?\s*0\s*0\s*([01])\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g;
  for (const m of pathD.matchAll(re)) {
    arcs.push({
      sweep: Number(m[1]),
      dx: Number(m[2]),
      dy: Number(m[3]),
    });
  }
  return arcs;
}

{
  const claims = new Map();
  const horizontal = hSeg(0, 100, 20);
  const vertical = vSeg(50, 0, 100);

  const d1 = buildPathWithHops([horizontal], [vertical], claims);
  assert.ok(d1.includes(" a "), "first crossing should create a hop");

  const d2 = buildPathWithHops([vertical], [horizontal], claims);
  assert.ok(!d2.includes(" a "), "second crossing at same point should not create another hop");
}

{
  const claims = new Map();
  // Floating-point drift in crossing coordinates should not allow both H and V hops
  // at the same visual crossing.
  const horizontal = hSeg(0, 100, 20);
  const nearVertical = vSeg(50.0000001, 0, 100);

  const d1 = buildPathWithHops([horizontal], [nearVertical], claims);
  assert.ok(d1.includes(" a "), "first crossing should create a hop");

  const nearHorizontal = hSeg(0, 100, 20.0000001);
  const vertical = vSeg(50, 0, 100);
  const d2 = buildPathWithHops([vertical], [nearHorizontal], claims);
  assert.ok(!d2.includes(" a "), "near-identical crossing should not create opposite-direction hop");
}

{
  const claims = new Map();
  const h1 = hSeg(0, 100, 20);
  const h2 = hSeg(0, 100, 20);
  const v = vSeg(50, 0, 100);
  const d1 = buildPathWithHops([h1], [v], claims);
  const d2 = buildPathWithHops([h2], [v], claims);
  assert.ok(d1.includes(" a "), "first same-orientation crossing should hop");
  assert.ok(d2.includes(" a "), "second same-orientation crossing should also hop");
}

{
  // Opposite travel direction through the same vertical crossing should still
  // render hop on the same visual side.
  const claims = new Map();
  const h = hSeg(0, 100, 50);
  const vDown = vSeg(50, 0, 100);
  const vUp = vSeg(50, 100, 0);
  const dDown = buildPathWithHops([vDown], [h], claims);
  const dUp = buildPathWithHops([vUp], [h], claims);
  const arcDown = collectHopArcs(dDown)[0];
  const arcUp = collectHopArcs(dUp)[0];
  assert.ok(arcDown && arcUp, "expected hop arcs for both vertical wires");
  const sideDown = Math.sign(arcDown.dy) * (arcDown.sweep === 1 ? 1 : -1);
  const sideUp = Math.sign(arcUp.dy) * (arcUp.sweep === 1 ? 1 : -1);
  assert.equal(sideDown, sideUp, "vertical hops at same crossing should use same visual side");
}

{
  const diagram = loadDiagramFromYaml("tests/bad_cross.yaml");
  const claims = new Map();
  const priorSegments = [];
  const hopAtPoint = new Map();
  for (const conn of diagram.connections || []) {
    const points = parsePoints(conn.points);
    const segments = buildSegs(points);
    const d = buildPathWithHops(segments, priorSegments.slice(), claims);
    const hopsInWire = collectHopCenters(d);
    if (conn.from === "b3" && conn.to === "b2") {
      assert.equal(
        hopsInWire.length,
        1,
        `expected exactly one hop for ${conn.from}:${conn.fromIndex}->${conn.to}:${conn.toIndex} in bad_cross`
      );
    }
    for (const hop of collectHopCenters(d)) {
      const prev = hopAtPoint.get(hop.key);
      if (prev) {
        assert.equal(
          prev,
          hop.orient,
          `mixed H/V hops at ${hop.key} in bad_cross example (${prev} vs ${hop.orient})`
        );
      } else {
        hopAtPoint.set(hop.key, hop.orient);
      }
    }
    segments.forEach((seg) => {
      if (!seg.isStub) priorSegments.push(seg);
    });
  }
}

console.log("render hop tests passed");
