import assert from "assert/strict";
import { readdirSync } from "fs";
import { join } from "path";
import { generateC } from "../codegen/c.js";
import {
  loadDiagramFromYaml,
  runJsSimOutputs,
  runGeneratedC,
  assertMultiSeriesClose,
  SAMPLE_TIME,
} from "./codegen-helpers.mjs";

const examplesDir = "examples";
const exampleFiles = readdirSync(examplesDir)
  .filter((name) => name.endsWith(".yaml"))
  .filter((name) => ["antiwindup.yaml", "emf.yaml", "inverted_pendulum.yaml"].includes(name));

const ensureLabelSinks = (diagram) => {
  const hasLabelSink = (diagram.blocks || []).some((block) => block.type === "labelSink");
  if (hasLabelSink) return diagram;

  const blocks = (diagram.blocks || []).map((block) => ({ ...block }));
  const connections = (diagram.connections || []).map((conn) => ({ ...conn }));
  const usedNames = new Set();
  const usedIds = new Set(blocks.map((block) => block.id));

  const addSink = (fromId, fromIndex, baseName) => {
    let name = baseName;
    let suffix = 1;
    while (usedNames.has(name)) {
      suffix += 1;
      name = `${baseName}_${suffix}`;
    }
    usedNames.add(name);
    let id = `label_${fromId}_${suffix}`;
    while (usedIds.has(id)) {
      suffix += 1;
      id = `label_${fromId}_${suffix}`;
    }
    usedIds.add(id);
    blocks.push({
      id,
      type: "labelSink",
      x: 0,
      y: 0,
      rotation: 0,
      params: { name, showNode: true },
    });
    connections.push({ from: fromId, to: id, fromIndex: fromIndex ?? 0, toIndex: 0 });
  };

  const scopeInputs = blocks
    .filter((block) => block.type === "scope")
    .map((scope) => connections.find((conn) => conn.to === scope.id && conn.toIndex === 0))
    .filter(Boolean);

  if (scopeInputs.length) {
    scopeInputs.forEach((conn) => addSink(conn.from, conn.fromIndex, `out_${conn.from}`));
  } else if (connections.length) {
    const conn = connections[0];
    addSink(conn.from, conn.fromIndex, `out_${conn.from}`);
  }

  return { ...diagram, blocks, connections };
};

assert.ok(exampleFiles.length > 0, "no example YAML files found");

exampleFiles.forEach((file) => {
  console.log(`c compare start: ${file}`);
  const diagram = ensureLabelSinks(loadDiagramFromYaml(join(examplesDir, file)));
  const duration = Number.isFinite(Number(diagram.runtime)) && Number(diagram.runtime) > 0
    ? Number(diagram.runtime)
    : 10.0;
  const jsSeries = runJsSimOutputs(diagram, duration, SAMPLE_TIME);
  const cCode = generateC(diagram, { sampleTime: SAMPLE_TIME });
  const cRows = runGeneratedC(cCode, duration);
  assertMultiSeriesClose(jsSeries, cRows, 1e-2);
  console.log(`c compare ok: ${file}`);
});

console.log("c compare examples passed");
