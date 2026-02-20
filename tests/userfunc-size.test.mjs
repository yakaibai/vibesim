import assert from "node:assert/strict";
import { createMathTemplates } from "../blocks/math.js";

const templates = createMathTemplates({
  createSvgElement: () => null,
  renderTeXMath: () => {},
  GRID_SIZE: 20,
});

const userFunc = templates.userFunc;
assert.ok(userFunc, "userFunc template should exist");
assert.equal(userFunc.width, 80, "default userFunc width should match integrator width");
assert.equal(userFunc.height, 80, "userFunc height should stay fixed");
assert.equal(userFunc.outputs[0].x, 80, "default output port should stay on block edge");

const shortExpr = { params: { expr: "u" } };
userFunc.resize(shortExpr);
assert.equal(shortExpr.width, 80, "single variable expression should keep minimum width");
assert.equal(shortExpr.height, 80, "resize should keep fixed height");
assert.equal(shortExpr.dynamicOutputs[0].x, 80, "output port should track resized width");

const longerExpr = { params: { expr: "sin(u)*u + sqrt(cos(u)) + 7" } };
userFunc.resize(longerExpr);
assert.ok(longerExpr.width > 80, "long expression should grow block width");
assert.equal(longerExpr.height, 80, "long expression should not change block height");
assert.equal(
  longerExpr.dynamicOutputs[0].x,
  longerExpr.width,
  "output port should remain on right edge after growth"
);

console.log("user function size tests passed");
