import { Complex, evalTransfer } from "./lti.js";
import { evalExpression, resolveNumeric as resolveNumericBase, resolveArray as resolveArrayBase } from "../utils/expr.js";

const INPUT_COUNTS = {
  gain: 1,
  integrator: 1,
  derivative: 1,
  tf: 1,
  delay: 1,
  pid: 1,
  lpf: 1,
  hpf: 1,
  sum: 3,
  labelSink: 1,
  labelSource: 0,
};

const LINEAR_TYPES = new Set(Object.keys(INPUT_COUNTS));
const isSupported = (type) => LINEAR_TYPES.has(type);

const toComplex = (value) => ({ re: Number(value) || 0, im: 0 });

const resolveNumeric = (value, variables) => resolveNumericBase(value, variables, { allowExpressions: true });
const resolveArray = (value, variables) => resolveArrayBase(value, variables, { allowExpressions: true });

const normalizeParams = (block, variables) => {
  const params = block.params || {};
  switch (block.type) {
    case "tf":
      return {
        ...params,
        num: resolveArray(params.num, variables),
        den: resolveArray(params.den, variables),
      };
    case "pid":
      return {
        ...params,
        kp: resolveNumeric(params.kp, variables),
        ki: resolveNumeric(params.ki, variables),
        kd: resolveNumeric(params.kd, variables),
      };
    case "gain":
      return { ...params, gain: resolveNumeric(params.gain, variables) };
    case "lpf":
    case "hpf":
      return { ...params, cutoff: resolveNumeric(params.cutoff, variables) };
    case "delay":
      return { ...params, delay: resolveNumeric(params.delay, variables) };
    case "sum":
      return { ...params, signs: Array.isArray(params.signs) ? params.signs.map(Number) : params.signs };
    default:
      return params;
  }
};

const evalBlockGain = (block, s) => {
  const params = block.params || {};
  switch (block.type) {
    case "gain":
      return toComplex(params.gain ?? 1);
    case "integrator":
      return Complex.div({ re: 1, im: 0 }, s);
    case "derivative":
      return s;
    case "tf":
      return evalTransfer(params.num || [0], params.den || [1], s);
    case "delay": {
      const delay = Number(params.delay) || 0;
      return Complex.expj(-delay * s.im);
    }
    case "pid": {
      const kp = Number(params.kp) || 0;
      const ki = Number(params.ki) || 0;
      const kd = Number(params.kd) || 0;
      const kiTerm = ki === 0 ? { re: 0, im: 0 } : Complex.div({ re: ki, im: 0 }, s);
      return Complex.add({ re: kp, im: 0 }, Complex.add(kiTerm, Complex.mul({ re: kd, im: 0 }, s)));
    }
    case "lpf": {
      const fc = Math.max(0, Number(params.cutoff) || 0);
      const wc = 2 * Math.PI * fc;
      return Complex.div({ re: wc, im: 0 }, Complex.add(s, { re: wc, im: 0 }));
    }
    case "hpf": {
      const fc = Math.max(0, Number(params.cutoff) || 0);
      const wc = 2 * Math.PI * fc;
      return Complex.div(s, Complex.add(s, { re: wc, im: 0 }));
    }
    default:
      return null;
  }
};

const buildInputMap = (blocks, connections) => {
  const map = new Map();
  blocks.forEach((block) => {
    map.set(block.id, Array(INPUT_COUNTS[block.type] || 0).fill(null));
  });
  connections.forEach((conn) => {
    if (!map.has(conn.to)) return;
    const inputs = map.get(conn.to);
    const idx = conn.toIndex ?? 0;
    if (idx >= 0 && idx < inputs.length) inputs[idx] = conn.from;
  });
  return map;
};

const solveLinearSystem = (A, b) => {
  const n = A.length;
  const M = A.map((row, i) => row.map((val) => ({ ...val })).concat({ ...b[i] }));

  for (let k = 0; k < n; k += 1) {
    let pivot = k;
    let maxMag = Complex.abs(M[k][k]);
    for (let i = k + 1; i < n; i += 1) {
      const mag = Complex.abs(M[i][k]);
      if (mag > maxMag) {
        maxMag = mag;
        pivot = i;
      }
    }
    if (maxMag === 0) return null;
    if (pivot !== k) {
      const tmp = M[k];
      M[k] = M[pivot];
      M[pivot] = tmp;
    }
    const pivotVal = M[k][k];
    for (let j = k; j <= n; j += 1) {
      M[k][j] = Complex.div(M[k][j], pivotVal);
    }
    for (let i = 0; i < n; i += 1) {
      if (i === k) continue;
      const factor = M[i][k];
      if (factor.re === 0 && factor.im === 0) continue;
      for (let j = k; j <= n; j += 1) {
        M[i][j] = Complex.sub(M[i][j], Complex.mul(factor, M[k][j]));
      }
    }
  }
  return M.map((row) => row[n]);
};

export function diagramToFRD(diagram, { input, output, omega } = {}) {
  const allBlocks = diagram.blocks || [];
  const connections = diagram.connections || [];
  const variables = diagram.variables || {};
  const byId = new Map(allBlocks.map((b) => [b.id, b]));
  const inputName = String(input || "").trim();
  const outputName = String(output || "").trim();
  const inputBlock = allBlocks.find(
    (block) => block.type === "labelSource" && String(block.params?.name || "").trim() === inputName
  );
  const outputBlock =
    allBlocks.find((block) => block.type === "labelSink" && String(block.params?.name || "").trim() === outputName) ||
    allBlocks.find((block) => block.id === outputName);
  if (!inputBlock) {
    throw new Error("Input label source not found for LTI conversion.");
  }
  if (!outputBlock) {
    throw new Error("Output label sink not found for LTI conversion.");
  }

  const forward = new Map();
  const backward = new Map();
  allBlocks.forEach((block) => {
    forward.set(block.id, []);
    backward.set(block.id, []);
  });
  connections.forEach((conn) => {
    if (!forward.has(conn.from) || !forward.has(conn.to)) return;
    forward.get(conn.from).push(conn.to);
    backward.get(conn.to).push(conn.from);
  });

  const traverse = (startId, adj) => {
    const visited = new Set();
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      const block = byId.get(id);
      const allowThrough = block && (LINEAR_TYPES.has(block.type) || block.type === "labelSource" || block.type === "labelSink");
      if (!allowThrough) continue;
      (adj.get(id) || []).forEach((next) => stack.push(next));
    }
    return visited;
  };

  const forwardReach = traverse(inputBlock.id, forward);
  const backwardReach = traverse(outputBlock.id, backward);
  const activeIds = new Set(
    Array.from(forwardReach).filter((id) => backwardReach.has(id))
  );
  activeIds.add(inputBlock.id);
  activeIds.add(outputBlock.id);

  const blocks = allBlocks
    .filter((block) => activeIds.has(block.id) && LINEAR_TYPES.has(block.type))
    .map((block) => ({
      ...block,
      params: normalizeParams(block, variables),
    }));
  const unsupported = allBlocks.filter(
    (block) => activeIds.has(block.id) && !LINEAR_TYPES.has(block.type)
  );
  if (unsupported.length) {
    throw new Error(`Unsupported blocks for LTI conversion: ${unsupported.map((b) => b.type).join(", ")}`);
  }

  const inputMap = buildInputMap(blocks, connections);
  const ids = blocks.map((block) => block.id);
  const idIndex = new Map(ids.map((id, idx) => [id, idx]));

  const freq = withZero(omega?.length ? omega : logspace(-3, 3, 300));
  const response = [];

  freq.forEach((w) => {
    const s = { re: 0, im: w };
    const A = ids.map(() => ids.map(() => ({ re: 0, im: 0 })));
    const b = ids.map(() => ({ re: 0, im: 0 }));

    blocks.forEach((block) => {
      const row = idIndex.get(block.id);
      A[row][row] = { re: 1, im: 0 };
      const inputs = inputMap.get(block.id) || [];

      if (block.type === "labelSource") {
        const name = String(block.params?.name || "").trim();
        b[row] = { re: name === inputName ? 1 : 0, im: 0 };
        return;
      }

      if (block.type === "sum") {
        const signs = block.params?.signs || [];
        inputs.forEach((fromId, idx) => {
          if (!fromId) return;
          const col = idIndex.get(fromId);
          if (col == null) return;
          const sign = Number(signs[idx] ?? 1) || 0;
          A[row][col] = Complex.sub(A[row][col], { re: sign, im: 0 });
        });
        return;
      }

      if (block.type === "labelSink") {
        const fromId = inputs[0];
        if (fromId) {
          const col = idIndex.get(fromId);
          if (col != null) A[row][col] = Complex.sub(A[row][col], { re: 1, im: 0 });
        }
        return;
      }

      const gain = evalBlockGain(block, s);
      if (!gain) return;
      const fromId = inputs[0];
      if (!fromId) return;
      const col = idIndex.get(fromId);
      if (col == null) return;
      A[row][col] = Complex.sub(A[row][col], gain);
    });

    const solution = solveLinearSystem(A, b);
    if (!solution) {
      response.push({ re: NaN, im: NaN });
      return;
    }
    const outIdx = idIndex.get(outputBlock.id);
    response.push(solution[outIdx]);
  });

  return { omega: freq, response };
}

export const logspace = (minExp, maxExp, points) => {
  const out = [];
  const step = (maxExp - minExp) / (points - 1);
  for (let i = 0; i < points; i += 1) {
    out.push(Math.pow(10, minExp + step * i));
  }
  return out;
};

export const withZero = (omega) => {
  if (!omega || !omega.length) return [0];
  if (omega[0] === 0) return omega;
  return [0, ...omega];
};
