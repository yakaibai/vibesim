import assert from "assert/strict";
import { TransferFunction } from "../control/lti.js";
import { stabilityMargins } from "../control/margins.js";
import { diagramToFRD } from "../control/diagram.js";

{
  const sys = new TransferFunction([1], [1, 1]);
  const [gm, pm, sm, wpc, wgc, wms] = stabilityMargins(sys);
  assert.ok(Number.isFinite(pm) || pm === Infinity, "phase margin should be finite or inf");
  assert.ok(Number.isFinite(sm) || sm === Infinity, "stability margin should be finite or inf");
  assert.ok(Number.isFinite(wgc) || Number.isNaN(wgc), "gain crossover should be number or NaN");
  assert.ok(Number.isFinite(gm) || gm === Infinity, "gain margin should be finite or inf");
  assert.ok(Number.isFinite(wms) || Number.isNaN(wms), "stability margin freq should be number or NaN");
}

{
  const sys = new TransferFunction([1], [1, 0]); // 1/s
  const [gm, pm, , , wgc] = stabilityMargins(sys);
  assert.ok(gm === Infinity, "gain margin should be infinite for 1/s");
  assert.ok(Math.abs(pm - 90) < 10, `phase margin should be near 90, got ${pm}`);
  assert.ok(Math.abs(wgc - 1) < 0.2, `gain crossover should be near 1, got ${wgc}`);
}

{
  const sys = new TransferFunction([2], [1, 1]); // 2/(s+1)
  const [, pm] = stabilityMargins(sys);
  assert.ok(Math.abs(pm - 120) < 15, `phase margin should be near 120, got ${pm}`);
}

{
  const sys = new TransferFunction([3], [1, 3]); // 3/(s+3), DC gain = 1
  const [, pm, , , wgc] = stabilityMargins(sys);
  assert.ok(Math.abs(Math.abs(pm) - 180) < 5, `phase margin should be near 180, got ${pm}`);
  assert.ok(Number.isFinite(wgc), "gain crossover should be finite at DC");
  assert.ok(Math.abs(wgc) < 1e-6, `gain crossover should be near 0, got ${wgc}`);
}

{
  const diagram = {
    blocks: [
      { id: "b3", type: "pid", params: { kp: "100", ki: "0", kd: "0" } },
      { id: "b4", type: "tf", params: { num: [1], den: ["I", 0, "-mg"] } },
      { id: "loop_input", type: "labelSource", params: { name: "loop_in" } },
      { id: "loop_output", type: "labelSink", params: { name: "loop_out", showNode: true } },
    ],
    connections: [
      { from: "b3", to: "b4", fromIndex: 0, toIndex: 0 },
      { from: "loop_input", to: "b3", fromIndex: 0, toIndex: 0 },
      { from: "b4", to: "loop_output", fromIndex: 0, toIndex: 0 },
    ],
    variables: { I: 1, mg: 1 },
  };
  const diagramMargins = stabilityMargins({ diagram, input: "loop_in", output: "loop_out" });
  const tfMargins = stabilityMargins(new TransferFunction([100], [1, 0, -1]));
  const eps = 1e-3;
  assert.ok(Math.abs(diagramMargins[0] - tfMargins[0]) < eps || (diagramMargins[0] === Infinity && tfMargins[0] === Infinity), "gm mismatch");
  assert.ok(Math.abs(diagramMargins[1] - tfMargins[1]) < eps, "pm mismatch");
  assert.ok(Math.abs(diagramMargins[2] - tfMargins[2]) < 1e-6, "sm mismatch");
  assert.ok(Number.isNaN(diagramMargins[3]) && Number.isNaN(tfMargins[3]), "wpc mismatch");
  assert.ok(Math.abs(diagramMargins[4] - tfMargins[4]) < 1e-2, "wgc mismatch");
  assert.ok(Math.abs(diagramMargins[5] - tfMargins[5]) < 1e-2, "wms mismatch");
}

{
  const diagram = {
    blocks: [
      { id: "b3", type: "pid", params: { kp: "13", ki: "0", kd: "1.95" } },
      { id: "b4", type: "tf", params: { num: [1], den: ["I", 0, "-mg"] } },
      { id: "loop_input", type: "labelSource", params: { name: "loop_in" } },
      { id: "loop_output", type: "labelSink", params: { name: "loop_out", showNode: true } },
    ],
    connections: [
      { from: "b3", to: "b4", fromIndex: 0, toIndex: 0 },
      { from: "loop_input", to: "b3", fromIndex: 0, toIndex: 0 },
      { from: "b4", to: "loop_output", fromIndex: 0, toIndex: 0 },
    ],
    variables: { I: 1, mg: 9 },
  };
  const [gm, pm, sm, wpc, wgc, wms] = stabilityMargins({ diagram, input: "loop_in", output: "loop_out" });
  assert.ok(Number.isFinite(gm), "gain margin should be finite for the PID + inverted pendulum loop");
  assert.ok(Math.abs(gm - 0.6923077) < 1e-3, `gm expected ~0.6923, got ${gm}`);
  assert.ok(Math.abs(pm - 17.9517367) < 1e-3, `pm expected ~17.9517, got ${pm}`);
  assert.ok(Math.abs(sm - 0.2933130) < 1e-3, `sm expected ~0.2933, got ${sm}`);
  assert.ok(Math.abs(wpc) < 1e-6, `wpc expected ~0, got ${wpc}`);
  assert.ok(Math.abs(wgc - 2.1599244) < 1e-3, `wgc expected ~2.1599, got ${wgc}`);
  assert.ok(Math.abs(wms - 1.7729875) < 1e-3, `wms expected ~1.7730, got ${wms}`);
}

{
  const diagram = {
    blocks: [
      { id: "pid", type: "pid", params: { kp: "13", ki: "0", kd: "1.95" } },
      { id: "loop_input", type: "labelSource", params: { name: "loop_in" } },
      { id: "loop_output", type: "labelSink", params: { name: "loop_out" } },
    ],
    connections: [
      { from: "loop_input", to: "pid", fromIndex: 0, toIndex: 0 },
      { from: "pid", to: "loop_output", fromIndex: 0, toIndex: 0 },
    ],
  };
  const frd = diagramToFRD(diagram, { input: "loop_in", output: "loop_out", omega: [0] });
  const resp = frd.response[0];
  assert.ok(Number.isFinite(resp.re) && Number.isFinite(resp.im), "PID response at DC should be finite when ki=0");
  assert.ok(Math.abs(resp.re - 13) < 1e-9, `PID DC gain should equal kp, got ${resp.re}`);
  assert.ok(Math.abs(resp.im) < 1e-9, `PID DC imag should be 0, got ${resp.im}`);
}

console.log("margins tests passed");
