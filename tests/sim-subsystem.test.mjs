import assert from 'node:assert/strict';
import { simulate } from '../sim.js';

const makeState = () => {
  const b1 = {
    id: 'b1',
    type: 'constant',
    inputs: 0,
    outputs: 1,
    params: { value: '1' },
  };
  const b2 = {
    id: 'b2',
    type: 'subsystem',
    inputs: 1,
    outputs: 1,
    params: {
      name: 'TestSubsystem',
      externalInputs: [{ id: 'in1', name: 'u' }],
      externalOutputs: [{ id: 'out1', name: 'y' }],
      subsystem: {
        name: 'Inner',
        blocks: [
          { id: 'in1', type: 'labelSource', params: { name: 'u', isExternalPort: true } },
          { id: 'g1', type: 'gain', params: { gain: '2' } },
          { id: 'out1', type: 'labelSink', params: { name: 'y', isExternalPort: true } },
        ],
        connections: [
          { from: 'in1', to: 'g1', fromIndex: 0, toIndex: 0 },
          { from: 'g1', to: 'out1', fromIndex: 0, toIndex: 0 },
        ],
        externalInputs: [{ id: 'in1', name: 'u' }],
        externalOutputs: [{ id: 'out1', name: 'y' }],
      },
    },
  };
  const b3 = {
    id: 'b3',
    type: 'fileSink',
    inputs: 1,
    outputs: 0,
    params: { path: 'output.csv' },
  };

  return {
    blocks: new Map([
      ['b2', b2],
      ['b1', b1],
      ['b3', b3],
    ]),
    connections: [
      { from: 'b1', to: 'b2', fromIndex: 0, toIndex: 0 },
      { from: 'b2', to: 'b3', fromIndex: 0, toIndex: 0 },
    ],
    variables: { pi: Math.PI, e: Math.E },
    sampleTime: 0.01,
  };
};

const state = makeState();
const runtimeInput = { value: '0.1' };
const statusEl = { textContent: '' };
let downloaded = null;

simulate({
  state,
  runtimeInput,
  statusEl,
  downloadFile: (name, content) => {
    downloaded = { name, content };
  },
});

assert.equal(statusEl.textContent, 'Done');
assert.ok(downloaded, 'Expected file sink to trigger download');
assert.equal(downloaded.name, 'output.csv');

const lines = downloaded.content.trim().split('\n');
assert.ok(lines.length >= 2, 'Expected CSV with header and data');
const lastLine = lines[lines.length - 1];
const parts = lastLine.split(',');
assert.equal(parts.length, 2, 'Expected t,value CSV rows');
const value = Number(parts[1]);
assert.ok(Number.isFinite(value), 'Expected numeric output value');
assert.ok(Math.abs(value - 2) < 1e-12, `Expected subsystem output 2, got ${value}`);

console.log('subsystem sim test passed');
