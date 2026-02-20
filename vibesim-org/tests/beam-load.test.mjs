import assert from "assert/strict";
import { loadDiagramFromYaml } from "./codegen-helpers.mjs";

const diagram = loadDiagramFromYaml("examples/beam.yaml");

assert.equal(diagram.name, "vibesim");
assert.ok(Array.isArray(diagram.blocks), "blocks should be an array");
assert.ok(Array.isArray(diagram.connections), "connections should be an array");
assert.equal(diagram.blocks.length, 17, "expected all top-level blocks to load");
assert.equal(diagram.connections.length, 43, "expected all top-level connections to load");

const typeCounts = new Map();
diagram.blocks.forEach((block) => {
  typeCounts.set(block.type, (typeCounts.get(block.type) || 0) + 1);
});
assert.equal(typeCounts.get("subsystem") || 0, 5, "expected five subsystem blocks");
assert.equal(typeCounts.get("scope") || 0, 5, "expected five scope blocks");

const subsystemBlocks = diagram.blocks.filter((b) => b.type === "subsystem");
subsystemBlocks.forEach((block) => {
  assert.ok(block.params?.subsystem, `subsystem block ${block.id} should keep nested spec`);
  assert.ok(Array.isArray(block.params.subsystem.blocks), `subsystem block ${block.id} should keep nested blocks`);
  assert.ok(Array.isArray(block.params.subsystem.connections), `subsystem block ${block.id} should keep nested connections`);
});

console.log("beam load parse test passed");
