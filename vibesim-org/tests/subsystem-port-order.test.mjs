import assert from 'node:assert/strict';
import { collectExternalPorts, stabilizeExternalPortOrder, externalPortsChanged } from '../utils/subsystem-ports.js';

// Deterministic order when Y ties: sort by y, then x, then id.
{
  const blocks = [
    { id: 'outB', type: 'labelSink', x: 200, y: 100, params: { name: 'B', isExternalPort: true } },
    { id: 'outA', type: 'labelSink', x: 100, y: 100, params: { name: 'A', isExternalPort: true } },
    { id: 'outC', type: 'labelSink', x: 100, y: 120, params: { name: 'C', isExternalPort: true } },
  ];
  const outs = collectExternalPorts(blocks, 'labelSink');
  assert.deepEqual(outs.map((p) => p.id), ['outA', 'outB', 'outC']);
}

// Preserve existing host order if the external port set is unchanged.
{
  const prev = [
    { id: 'o2', name: 'O_2' },
    { id: 'o1', name: 'O_1' },
    { id: 'o3', name: 'O_3' },
  ];
  const nextDetected = [
    { id: 'o1', name: 'O_1' },
    { id: 'o2', name: 'O_2' },
    { id: 'o3', name: 'O_3' },
  ];
  const stabilized = stabilizeExternalPortOrder(nextDetected, prev);
  assert.deepEqual(stabilized.map((p) => p.id), ['o2', 'o1', 'o3']);
  assert.equal(externalPortsChanged(prev, stabilized), false);
}

// If set really changes, keep new detected order and report change.
{
  const prev = [{ id: 'o1', name: 'O_1' }];
  const nextDetected = [{ id: 'o1', name: 'O_1' }, { id: 'o2', name: 'O_2' }];
  const stabilized = stabilizeExternalPortOrder(nextDetected, prev);
  assert.deepEqual(stabilized.map((p) => p.id), ['o1', 'o2']);
  assert.equal(externalPortsChanged(prev, stabilized), true);
}

console.log('subsystem port order test passed');
