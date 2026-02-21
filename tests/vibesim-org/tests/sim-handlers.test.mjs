import assert from "node:assert/strict";
import { blockLibrary } from "../blocks/index.js";
import { simHandlers } from "../blocks/sim/index.js";

const blockTypes = blockLibrary.flatMap((group) => group.blocks.map((b) => b.type));

blockTypes.forEach((type) => {
  assert.ok(simHandlers[type], `missing sim handler for ${type}`);
});

console.log("sim handlers registry tests passed");
