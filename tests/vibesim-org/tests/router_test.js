let routeConnections2 = null;

const GRID_SIZE = 10;
const GRID_COUNT = 20;
const LOGICAL_SIZE = GRID_SIZE * GRID_COUNT;
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const modeSelect = document.getElementById("modeSelect");
const colorSelect = document.getElementById("colorSelect");
const dirSelect = document.getElementById("dirSelect");
const solveBtn = document.getElementById("solveBtn");
const incrSolveBtn = document.getElementById("incrSolveBtn");
const resetSolnBtn = document.getElementById("resetSolnBtn");
const resetBoardBtn = document.getElementById("resetBoardBtn");
const statusEl = document.getElementById("status");
const debugEl = document.getElementById("debugOut");

let nodes = [];
let obstacles = new Map();
let connections = [];
let prevSolution = null;
let nodeCounter = 0;
let changedNodes = new Set();
let obstaclesVersion = 0;
let lastSolveObstacleVersion = 0;

function cellKey(x, y) {
  return `${x},${y}`;
}

function findNodeAt(x, y) {
  return nodes.find((node) => node.x === x && node.y === y);
}

function addOrUpdateNode(x, y) {
  const existing = findNodeAt(x, y);
  const color = colorSelect.value;
  const dir = dirSelect.value;
  if (existing) {
    existing.color = color;
    existing.dir = dir;
    changedNodes.add(existing.id);
    return;
  }
  const id = `n${nodeCounter += 1}`;
  nodes.push({ id, x, y, dir, color, order: nodeCounter });
  changedNodes.add(id);
}

function addObstacle(x, y) {
  const key = cellKey(x, y);
  if (!obstacles.has(key)) {
    obstacles.set(key, { x0: x, y0: y, x1: x + 0.001, y1: y + 0.001 });
    obstaclesVersion += 1;
  }
}

function eraseAt(x, y) {
  const node = findNodeAt(x, y);
  if (node) {
    nodes = nodes.filter((item) => item.id !== node.id);
    changedNodes.add(node.id);
  }
  const key = cellKey(x, y);
  if (obstacles.delete(key)) {
    obstaclesVersion += 1;
  }
}

function rebuildConnections() {
  const colors = new Map();
  nodes.forEach((node) => {
    if (!colors.has(node.color)) colors.set(node.color, []);
    colors.get(node.color).push(node);
  });
  const nextConnections = [];
  colors.forEach((list) => {
    list.sort((a, b) => a.order - b.order);
    if (list.length < 2) return;
    const root = list[0];
    for (let i = 1; i < list.length; i += 1) {
      nextConnections.push({
        from: root.id,
        to: list[i].id,
        color: list[i].color,
        key: `${root.id}->${list[i].id}`,
      });
    }
  });
  connections = nextConnections;
}

function solve(incremental) {
  if (!routeConnections2) {
    setStatus("Router not loaded. Serve /tests from a web server.", true);
    return;
  }
  rebuildConnections();
  if (connections.length === 0) {
    setStatus("No connections: place nodes in pairs of the same color.", true);
    draw();
    return;
  }
  const fullOptimize = !incremental || obstaclesVersion !== lastSolveObstacleVersion;
  if (fullOptimize) {
    prevSolution = null;
  }
  const result = routeConnections2({
    nodes,
    connections,
    obstacles: Array.from(obstacles.values()),
    prevSolution,
    settings: {
      maxTimeMs: fullOptimize ? 2000 : 200,
      incremental,
      fullOptimize,
      changedNodes: Array.from(changedNodes),
      nearWirePenalty1: 6,
      nearWirePenalty2: 2,
      nearObstaclePenalty1: 10,
      nearObstaclePenalty2: 4,
    },
  });
  prevSolution = result;
  changedNodes.clear();
  lastSolveObstacleVersion = obstaclesVersion;
  setStatus(`Solved ${connections.length} connection(s).`, false);
  renderDebug(result);
  draw();
}

function resetBoard() {
  nodes = [];
  obstacles.clear();
  connections = [];
  prevSolution = null;
  nodeCounter = 0;
  changedNodes.clear();
  obstaclesVersion += 1;
  setStatus("Board reset.", false);
  renderDebug(null);
  draw();
}

function resetSolution() {
  prevSolution = null;
  setStatus("Solution cleared.", false);
  renderDebug(null);
  draw();
}

function drawGrid() {
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width ? LOGICAL_SIZE / rect.width : 1;
  ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);
  ctx.strokeStyle = "#d9d5cd";
  ctx.lineWidth = Math.max(0.5, scale);
  for (let y = 0; y < GRID_COUNT; y += 1) {
    for (let x = 0; x < GRID_COUNT; x += 1) {
      ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    }
  }
}

function drawObstacles() {
  ctx.fillStyle = "#2b2b2b";
  obstacles.forEach((obs) => {
    const x = obs.x0 * GRID_SIZE;
    const y = obs.y0 * GRID_SIZE;
    ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
  });
}

function drawNodes() {
  nodes.forEach((node) => {
    const x = node.x * GRID_SIZE;
    const y = node.y * GRID_SIZE;
    ctx.fillStyle = node.color;
    ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    if (isRootNode(node)) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1.5, y + 1.5, GRID_SIZE - 3, GRID_SIZE - 3);
    }
    drawArrow(node);
  });
}

function isRootNode(node) {
  const sameColor = nodes.filter((item) => item.color === node.color);
  if (sameColor.length < 2) return false;
  return sameColor.reduce((minNode, current) => (current.order < minNode.order ? current : minNode), sameColor[0])
    .id === node.id;
}

function drawArrow(node) {
  const cx = node.x * GRID_SIZE + GRID_SIZE / 2;
  const cy = node.y * GRID_SIZE + GRID_SIZE / 2;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  const len = GRID_SIZE * 0.3;
  let dx = 0;
  let dy = 0;
  if (node.dir === "right") dx = len;
  if (node.dir === "left") dx = -len;
  if (node.dir === "up") dy = -len;
  if (node.dir === "down") dy = len;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + dx, cy + dy);
  ctx.stroke();
}

function drawWires() {
  if (!prevSolution || !prevSolution.wires) return;
  prevSolution.wires.forEach((wire) => {
    const conn = connections.find((item) => item.key === wire.key || item.id === wire.key);
    const color = conn ? conn.color : "#444";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    wire.points.forEach((pt, idx) => {
      const x = pt.x * GRID_SIZE + GRID_SIZE / 2;
      const y = pt.y * GRID_SIZE + GRID_SIZE / 2;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
}

function setStatus(text, warn) {
  if (!statusEl) return;
  statusEl.textContent = `Status: ${text}`;
  statusEl.style.color = warn ? "#a33" : "#444";
}

function renderDebug(result) {
  if (!debugEl) return;
  if (!result) {
    debugEl.textContent = "";
    return;
  }
  const wires = result.wires ? Array.from(result.wires.entries()) : [];
  const lines = [
    `connections: ${connections.length}`,
    `wires: ${wires.length}`,
    `durationMs: ${result.durationMs ?? "n/a"}`,
    `failed: ${result.cost?.failed ?? 0}`,
    `total cost: ${result.cost?.total ?? 0}`,
    `costs: length=${result.cost?.length ?? 0} turns=${result.cost?.turns ?? 0} hops=${result.cost?.hops ?? 0} near=${result.cost?.near ?? 0}`,
    `near counts: wire1=${result.nearBreakdown?.wire1 ?? 0} wire2=${result.nearBreakdown?.wire2 ?? 0} obs1=${result.nearBreakdown?.obs1 ?? 0} obs2=${result.nearBreakdown?.obs2 ?? 0}`,
  ];
  wires.forEach(([key, wire]) => {
    lines.push(`${key}: points=${wire.points.length} length=${wire.cost?.length ?? "?"}`);
  });
  if (result.failures && result.failures.length) {
    lines.push("failures:");
    result.failures.forEach((fail) => {
      lines.push(
        `- ${fail.key} (${fail.reason}) start=${fail.start.x},${fail.start.y},${fail.start.dir} end=${fail.end.x},${fail.end.y},${fail.end.dir}`
      );
    });
  }
  lines.push("snapshot:");
  lines.push(`nodes=${JSON.stringify(nodes)}`);
  lines.push(`connections=${JSON.stringify(connections)}`);
  lines.push(`obstacles=${JSON.stringify(Array.from(obstacles.values()))}`);
  if (result.wires && result.wires.size) {
    const wireDump = {};
    result.wires.forEach((wire, key) => {
      wireDump[key] = wire.points;
    });
    lines.push(`wires=${JSON.stringify(wireDump)}`);
  }
  debugEl.textContent = lines.join("\n");
}

function draw() {
  drawGrid();
  drawObstacles();
  drawWires();
  drawNodes();
}

function handlePointerCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = LOGICAL_SIZE / rect.width;
  const x = Math.floor(((clientX - rect.left) * scale) / GRID_SIZE);
  const y = Math.floor(((clientY - rect.top) * scale) / GRID_SIZE);
  if (x < 0 || y < 0 || x >= GRID_COUNT || y >= GRID_COUNT) return;
  const mode = modeSelect.value;
  if (mode === "node") addOrUpdateNode(x, y);
  if (mode === "obstacle") addObstacle(x, y);
  if (mode === "erase") eraseAt(x, y);
  draw();
}

let isDrawing = false;
function startDraw(evt) {
  evt.preventDefault();
  isDrawing = true;
  if (evt.pointerId != null) {
    canvas.setPointerCapture(evt.pointerId);
  }
  handlePointerCoords(evt.clientX, evt.clientY);
}

function moveDraw(evt) {
  evt.preventDefault();
  if (!isDrawing) return;
  handlePointerCoords(evt.clientX, evt.clientY);
}

function endDraw(evt) {
  evt.preventDefault();
  isDrawing = false;
}

canvas.addEventListener("pointerdown", startDraw);
canvas.addEventListener("pointermove", moveDraw);
canvas.addEventListener("pointerup", endDraw);
canvas.addEventListener("pointerleave", endDraw);
canvas.addEventListener("pointercancel", endDraw);
canvas.addEventListener("click", (evt) => {
  handlePointerCoords(evt.clientX, evt.clientY);
});

canvas.addEventListener("touchstart", (evt) => {
  if (evt.touches.length === 0) return;
  evt.preventDefault();
  isDrawing = true;
  handlePointerCoords(evt.touches[0].clientX, evt.touches[0].clientY);
}, { passive: false });
canvas.addEventListener("touchmove", (evt) => {
  if (!isDrawing || evt.touches.length === 0) return;
  evt.preventDefault();
  handlePointerCoords(evt.touches[0].clientX, evt.touches[0].clientY);
}, { passive: false });
canvas.addEventListener("touchend", (evt) => {
  evt.preventDefault();
  isDrawing = false;
}, { passive: false });

solveBtn.addEventListener("click", () => solve(false));
incrSolveBtn.addEventListener("click", () => solve(true));
resetSolnBtn.addEventListener("click", () => resetSolution());
resetBoardBtn.addEventListener("click", () => resetBoard());

function resizeCanvas() {
  canvas.width = LOGICAL_SIZE;
  canvas.height = LOGICAL_SIZE;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  draw();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

async function loadRouter() {
  try {
    ({ routeConnections2 } = await import("../router.js"));
  } catch (err) {
    try {
      ({ routeConnections2 } = await import("./router.js"));
    } catch (innerErr) {
      routeConnections2 = null;
    }
  }
  if (routeConnections2) {
    setStatus("Router loaded. Place nodes to begin.", false);
  } else {
    setStatus("Router not loaded. Serve /tests from a web server.", true);
  }
  renderDebug(null);
}

loadRouter().then(() => draw());
