import assert from "node:assert/strict";
import { simulate } from "../sim.js";

const makeState = () => {
  const src = {
    id: "src",
    type: "constant",
    inputs: 0,
    outputs: 1,
    params: { value: "2" },
  };
  const sub = {
    id: "sub",
    type: "subsystem",
    inputs: 1,
    outputs: 3,
    params: {
      name: "MultiOut",
      externalInputs: [{ id: "in1", name: "u" }],
      externalOutputs: [
        { id: "o1", name: "O_1" },
        { id: "o2", name: "O_2" },
        { id: "o3", name: "O_3" },
      ],
      subsystem: {
        name: "Inner",
        blocks: [
          { id: "in1", type: "labelSource", params: { name: "u", isExternalPort: true } },
          { id: "g1", type: "gain", params: { gain: "1" } },
          { id: "g2", type: "gain", params: { gain: "2" } },
          { id: "g3", type: "gain", params: { gain: "3" } },
          { id: "o1", type: "labelSink", params: { name: "O_1", isExternalPort: true } },
          { id: "o2", type: "labelSink", params: { name: "O_2", isExternalPort: true } },
          { id: "o3", type: "labelSink", params: { name: "O_3", isExternalPort: true } },
        ],
        connections: [
          { from: "in1", to: "g1", fromIndex: 0, toIndex: 0 },
          { from: "in1", to: "g2", fromIndex: 0, toIndex: 0 },
          { from: "in1", to: "g3", fromIndex: 0, toIndex: 0 },
          { from: "g1", to: "o1", fromIndex: 0, toIndex: 0 },
          { from: "g2", to: "o2", fromIndex: 0, toIndex: 0 },
          { from: "g3", to: "o3", fromIndex: 0, toIndex: 0 },
        ],
        externalInputs: [{ id: "in1", name: "u" }],
        externalOutputs: [
          { id: "o1", name: "O_1" },
          { id: "o2", name: "O_2" },
          { id: "o3", name: "O_3" },
        ],
      },
    },
  };
  const sink1 = { id: "sink1", type: "fileSink", inputs: 1, outputs: 0, params: { path: "o1.csv" } };
  const sink2 = { id: "sink2", type: "fileSink", inputs: 1, outputs: 0, params: { path: "o2.csv" } };
  const sink3 = { id: "sink3", type: "fileSink", inputs: 1, outputs: 0, params: { path: "o3.csv" } };

  return {
    blocks: new Map([
      ["src", src],
      ["sub", sub],
      ["sink1", sink1],
      ["sink2", sink2],
      ["sink3", sink3],
    ]),
    connections: [
      { from: "src", to: "sub", fromIndex: 0, toIndex: 0 },
      { from: "sub", to: "sink1", fromIndex: 0, toIndex: 0 },
      { from: "sub", to: "sink2", fromIndex: 1, toIndex: 0 },
      { from: "sub", to: "sink3", fromIndex: 2, toIndex: 0 },
    ],
    variables: {},
    sampleTime: 0.01,
  };
};

const state = makeState();
const runtimeInput = { value: "0.05" };
const statusEl = { textContent: "" };
const files = new Map();

simulate({
  state,
  runtimeInput,
  statusEl,
  downloadFile: (name, content) => files.set(name, content),
});

assert.equal(statusEl.textContent, "Done");
assert.equal(files.size, 3, "Expected three file sink outputs");

const lastValue = (csv) => {
  const lines = String(csv || "").trim().split("\n");
  const parts = (lines[lines.length - 1] || "").split(",");
  return Number(parts[1]);
};

const v1 = lastValue(files.get("o1.csv"));
const v2 = lastValue(files.get("o2.csv"));
const v3 = lastValue(files.get("o3.csv"));

assert.ok(Math.abs(v1 - 2) < 1e-12, `Expected O1=2 got ${v1}`);
assert.ok(Math.abs(v2 - 4) < 1e-12, `Expected O2=4 got ${v2}`);
assert.ok(Math.abs(v3 - 6) < 1e-12, `Expected O3=6 got ${v3}`);

console.log("subsystem multi-output sim test passed");
