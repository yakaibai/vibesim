import assert from 'assert/strict';
import { generateCode } from '../codegen/index.js';
import { runGeneratedC, runGeneratedPython } from './codegen-helpers.mjs';

const buildSubsystemDiagram = () => ({
  name: 'subsystem_codegen',
  runtime: 0.1,
  sampleTime: 0.01,
  variables: {},
  blocks: [
    { id: 'b1', type: 'constant', params: { value: 2 } },
    {
      id: 'b2',
      type: 'subsystem',
      params: {
        name: 'Inner',
        externalInputs: [{ id: 'in1', name: 'u' }],
        externalOutputs: [{ id: 'out1', name: 'y' }],
        subsystem: {
          name: 'Inner',
          blocks: [
            { id: 'in1', type: 'labelSource', params: { name: 'u', isExternalPort: true } },
            { id: 'g1', type: 'gain', params: { gain: 3 } },
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
    },
    { id: 'b3', type: 'labelSink', params: { name: 'y' } },
  ],
  connections: [
    { from: 'b1', to: 'b2', fromIndex: 0, toIndex: 0 },
    { from: 'b2', to: 'b3', fromIndex: 0, toIndex: 0 },
  ],
});

const assertRowsAreSix = (rows, label) => {
  assert.ok(rows.length > 0, `${label}: expected at least one row`);
  rows.forEach((row, idx) => {
    const y = row.values[0];
    assert.ok(Number.isFinite(y), `${label}: row ${idx} should be finite`);
    assert.ok(Math.abs(y - 6) < 1e-9, `${label}: row ${idx} expected 6, got ${y}`);
  });
};

{
  const diagram = buildSubsystemDiagram();
  const cCode = generateCode({ lang: 'c', sampleTime: 0.01, includeMain: true, diagram });
  const cRows = runGeneratedC(cCode, 0.1);
  assertRowsAreSix(cRows, 'C');
}

{
  const diagram = buildSubsystemDiagram();
  const pyCode = generateCode({ lang: 'python', sampleTime: 0.01, includeMain: true, diagram });
  const pyRows = runGeneratedPython(pyCode, 0.1);
  assertRowsAreSix(pyRows, 'Python');
}

console.log('codegen subsystem tests passed');
