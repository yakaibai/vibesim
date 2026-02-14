import assert from "node:assert/strict";
import { collectSharedSourceSplitPoints } from "../render.js";

const sortPoints = (points) =>
  points
    .map((pt) => `${pt.x},${pt.y}`)
    .sort();

{
  const points = collectSharedSourceSplitPoints([
    { from: "src", fromIndex: 0, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }] },
    { from: "src", fromIndex: 0, points: [{ x: 0, y: 0 }, { x: 4, y: 0 }] },
  ]);
  assert.deepEqual(sortPoints(points), ["2,0"], "expected one split at shared tee");
}

{
  const points = collectSharedSourceSplitPoints([
    { from: "a", fromIndex: 0, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 }] },
    { from: "b", fromIndex: 0, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }] },
  ]);
  assert.deepEqual(sortPoints(points), [], "different source ports must not produce split dots");
}

{
  const points = collectSharedSourceSplitPoints([
    { from: "src", fromIndex: 0, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }] },
    { from: "src", fromIndex: 0, points: [{ x: 0, y: 0 }, { x: 0, y: 2 }] },
  ]);
  assert.deepEqual(sortPoints(points), [], "no shared segment means no split junction dot");
}

{
  const points = collectSharedSourceSplitPoints([
    { from: "src", fromIndex: 0, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }] },
    { from: "src", fromIndex: 0, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }] },
    { from: "src", fromIndex: 0, points: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 }, { x: 4, y: -2 }] },
  ]);
  assert.deepEqual(sortPoints(points), ["2,0", "4,0"], "expected both upstream and downstream split points");
}

{
  const antiwindup = [
    { from: "b5", fromIndex: 0, points: [{ x: 2150, y: 1740 }, { x: 2190, y: 1740 }, { x: 2190, y: 1630 }] },
    { from: "b6", fromIndex: 0, points: [{ x: 2210, y: 1610 }, { x: 2290, y: 1610 }] },
    { from: "b9", fromIndex: 0, points: [{ x: 2370, y: 1610 }, { x: 2450, y: 1610 }] },
    { from: "b6", fromIndex: 0, points: [{ x: 2210, y: 1610 }, { x: 2250, y: 1610 }, { x: 2250, y: 1740 }, { x: 2310, y: 1740 }] },
    { from: "b9", fromIndex: 0, points: [{ x: 2370, y: 1610 }, { x: 2400, y: 1610 }, { x: 2400, y: 1740 }, { x: 2350, y: 1740 }] },
    { from: "b14", fromIndex: 0, points: [{ x: 1790, y: 1610 }, { x: 1970, y: 1610 }] },
    { from: "b12", fromIndex: 0, points: [{ x: 1680, y: 1610 }, { x: 1750, y: 1610 }] },
    { from: "b8", fromIndex: 0, points: [{ x: 2610, y: 1610 }, { x: 2640, y: 1610 }, { x: 2640, y: 1930 }, { x: 1770, y: 1930 }, { x: 1770, y: 1630 }] },
    { from: "b14", fromIndex: 0, points: [{ x: 1790, y: 1610 }, { x: 1860, y: 1610 }, { x: 1860, y: 1720 }] },
    { from: "b12", fromIndex: 0, points: [{ x: 1680, y: 1610 }, { x: 1710, y: 1610 }, { x: 1710, y: 1540 }, { x: 2690, y: 1540 }, { x: 2690, y: 1570 }, { x: 2730, y: 1570 }] },
    { from: "b8", fromIndex: 0, points: [{ x: 2610, y: 1610 }, { x: 2730, y: 1610 }] },
    { from: "b15", fromIndex: 0, points: [{ x: 1880, y: 1740 }, { x: 1920, y: 1740 }] },
    { from: "b16", fromIndex: 0, points: [{ x: 2000, y: 1740 }, { x: 2050, y: 1740 }] },
    { from: "b10", fromIndex: 0, points: [{ x: 2330, y: 1760 }, { x: 2330, y: 1860 }, { x: 2070, y: 1860 }] },
    { from: "b6", fromIndex: 0, points: [{ x: 2210, y: 1610 }, { x: 2250, y: 1610 }, { x: 2250, y: 1680 }, { x: 2690, y: 1680 }, { x: 2690, y: 1650 }, { x: 2730, y: 1650 }] },
    { from: "b3", fromIndex: 0, points: [{ x: 2070, y: 1610 }, { x: 2170, y: 1610 }] },
    { from: "b18", fromIndex: 0, points: [{ x: 1970, y: 1860 }, { x: 1860, y: 1860 }, { x: 1860, y: 1760 }] },
  ];
  const points = collectSharedSourceSplitPoints(antiwindup);
  assert.deepEqual(
    sortPoints(points),
    ["1710,1610", "1860,1610", "2250,1610", "2250,1680", "2400,1610", "2640,1610"],
    "antiwindup should expose all expected shared-source split points"
  );
}

console.log("shared source split point tests passed");
