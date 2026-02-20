import assert from "node:assert/strict";
import { createUtilityTemplates, utilityLibrary } from "../blocks/utility.js";

assert.ok(
  utilityLibrary.blocks.some((entry) => entry.type === "comment"),
  "utility library should expose Comment block"
);

const templates = createUtilityTemplates({
  createSvgElement: () => null,
  renderTeXMath: () => {},
  GRID_SIZE: 20,
  formatLabelTeX: (text) => text,
});

const comment = templates.comment;
assert.ok(comment, "comment template should exist");
assert.equal(comment.width, 220, "comment block default width");
assert.equal(comment.height, 120, "comment block default height");
assert.deepEqual(comment.inputs, [], "comment block should have no input ports");
assert.deepEqual(comment.outputs, [], "comment block should have no output ports");
assert.equal(comment.defaultParams.commentText, "", "comment text default should be empty");
assert.equal(comment.defaultParams.showBorder, true, "comment border should default on");

console.log("comment block tests passed");
