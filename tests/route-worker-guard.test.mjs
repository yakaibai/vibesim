import assert from 'node:assert/strict';
import { buildConnectionSignature, canApplyWorkerRoutes } from '../utils/route-worker-guard.js';

const connsA = [
  { from: 'a', to: 'b', fromIndex: 0, toIndex: 0 },
  { from: 'b', to: 'c', fromIndex: 0, toIndex: 0 },
];
const connsB = [
  { from: 'x', to: 'y', fromIndex: 0, toIndex: 0 },
  { from: 'y', to: 'z', fromIndex: 0, toIndex: 0 },
  { from: 'z', to: 'w', fromIndex: 0, toIndex: 0 },
];

const sigA = buildConnectionSignature(connsA);
const sigB = buildConnectionSignature(connsB);

assert.notEqual(sigA, sigB, 'signatures should differ');

const routesA = [
  [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  [{ x: 1, y: 0 }, { x: 2, y: 0 }],
];

// Happy path
assert.equal(
  canApplyWorkerRoutes({
    jobEpoch: 5,
    currentEpoch: 5,
    jobSignature: sigA,
    currentSignature: sigA,
    routes: routesA,
    connectionCount: 2,
  }),
  true
);

// Repro guard 1: stale epoch (e.g. entered/leaved subsystem while worker job still running)
assert.equal(
  canApplyWorkerRoutes({
    jobEpoch: 5,
    currentEpoch: 6,
    jobSignature: sigA,
    currentSignature: sigA,
    routes: routesA,
    connectionCount: 2,
  }),
  false
);

// Repro guard 2: diagram signature changed
assert.equal(
  canApplyWorkerRoutes({
    jobEpoch: 6,
    currentEpoch: 6,
    jobSignature: sigA,
    currentSignature: sigB,
    routes: routesA,
    connectionCount: 3,
  }),
  false
);

// Repro guard 3: route count mismatch
assert.equal(
  canApplyWorkerRoutes({
    jobEpoch: 6,
    currentEpoch: 6,
    jobSignature: sigA,
    currentSignature: sigA,
    routes: routesA,
    connectionCount: 3,
  }),
  false
);

console.log('route worker guard test passed');
