import assert from "assert/strict";
import { buildWireNearMap } from "../router.js";

const bounds = { minX: 0, minY: 0, maxX: 4, maxY: 4 };
const occupancy = {
  points: new Map([
    ["2,2", { owners: new Set(["a"]), wireIds: new Set(["w1"]) }],
  ]),
};

const map = buildWireNearMap(occupancy, bounds);
const gridW = bounds.maxX - bounds.minX + 1;

const getNearCode = (x, y) => map[(y - bounds.minY) * gridW + (x - bounds.minX)];

assert.equal(getNearCode(2, 2), 0, "same cell should not be marked by near map");
assert.equal(getNearCode(2, 3), 1, "adjacent cell should be near1");
assert.equal(getNearCode(3, 3), 2, "diagonal should be near2");
assert.equal(getNearCode(4, 4), 0, "far cell should be clear");

console.log("router wire-near tests passed");
