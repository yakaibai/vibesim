import assert from "assert/strict";
import { buildObstacleGrid, buildObstacleNearMap } from "../router.js";

const bounds = { minX: 0, minY: 0, maxX: 4, maxY: 4 };
const obstacles = [
  { x0: 2, y0: 2, x1: 2, y1: 2 },
];

const grid = buildObstacleGrid(obstacles);
const map = buildObstacleNearMap(grid, bounds);
const gridW = bounds.maxX - bounds.minX + 1;

const getNearCode = (x, y) => map[(y - bounds.minY) * gridW + (x - bounds.minX)];

assert.equal(getNearCode(2, 2), 1, "obstacle cell should be obs1");
assert.equal(getNearCode(2, 3), 1, "adjacent cell should be obs1");
assert.equal(getNearCode(3, 3), 2, "diagonal neighbor should be obs2");
assert.equal(getNearCode(4, 4), 0, "far cell should be clear");

console.log("router near-map tests passed");
