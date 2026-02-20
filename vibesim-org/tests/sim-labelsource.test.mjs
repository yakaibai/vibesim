import assert from "node:assert/strict";
import { __testOnly } from "../sim.js";

const { resolveLabelSourcesOnce } = __testOnly;

{
  const blocks = [
    { id: "src", type: "labelSource", params: { name: "u_f" } },
    { id: "sink", type: "labelSink", params: { name: "u_f" } },
  ];
  const outputs = new Map();
  const inputMap = new Map([
    ["src", []],
    ["sink", ["tf"]],
  ]);
  const labelSinks = new Map([["u_f", "sink"]]);

  outputs.set("tf", 0);
  resolveLabelSourcesOnce(blocks, outputs, inputMap, labelSinks);
  assert.equal(outputs.get("src"), 0, "initial labelSource should be 0");

  outputs.set("tf", 1);
  resolveLabelSourcesOnce(blocks, outputs, inputMap, labelSinks);
  assert.equal(outputs.get("src"), 1, "labelSource should update when sink input changes");
}

console.log("sim label source tests passed");
