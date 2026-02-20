import assert from "node:assert/strict";
import { __testOnly } from "../sim.js";

const { buildTfModel, outputFromState, integrateTfRK4 } = __testOnly;

const runStepResponse = (model, steps = 40, dt = 0.01, input = 1) => {
  const out = [];
  let state = model.state.slice();
  for (let i = 0; i < steps; i += 1) {
    out.push(outputFromState(model, state, input));
    state = integrateTfRK4(model, state, input, dt);
  }
  return out;
};

{
  const modelA = buildTfModel([1], [0, 1]);
  const modelB = buildTfModel([1], [1]);
  assert.ok(modelA, "modelA should be built");
  assert.ok(modelB, "modelB should be built");
  const outA = runStepResponse(modelA);
  const outB = runStepResponse(modelB);
  assert.equal(outA.length, outB.length, "output lengths must match");
  outA.forEach((val, idx) => {
    const diff = Math.abs(val - outB[idx]);
    assert.ok(diff < 1e-9, `step response mismatch at ${idx}: ${val} vs ${outB[idx]}`);
  });
}

console.log("sim tf tests passed");
