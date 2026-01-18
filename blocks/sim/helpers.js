export const normalizePoly = (values) => {
  const arr = (values || []).map((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  });
  let idx = 0;
  while (idx < arr.length - 1 && Math.abs(arr[idx]) < 1e-12) idx += 1;
  const trimmed = arr.length ? arr.slice(idx) : [0];
  const allZero = trimmed.every((v) => Math.abs(v) < 1e-12);
  return { trimmed: allZero ? [0] : trimmed, allZero };
};

export const integrateRK4 = (state, input, dt) => {
  const k1 = input;
  const k2 = input;
  const k3 = input;
  const k4 = input;
  return state + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
};

export const buildTfModel = (num, den) => {
  const { trimmed: numArr } = normalizePoly(num);
  const { trimmed: denArr, allZero: denAllZero } = normalizePoly(den);
  if (denAllZero) return null;
  const a0 = denArr[0];
  const denNorm = denArr.map((v) => v / a0);
  const n = denNorm.length - 1;
  if (n === 0) {
    const gain = (numArr[0] || 0) / a0;
    return { n: 0, A: [], B: [], C: [], D: gain, state: [] };
  }
  const numPadded = Array(n + 1 - numArr.length).fill(0).concat(numArr);
  const a = denNorm.slice(1);
  const b = numPadded.map((v) => v / a0);

  const A = Array.from({ length: n }, (_, i) => {
    const row = Array(n).fill(0);
    if (i < n - 1) row[i + 1] = 1;
    else {
      for (let j = 0; j < n; j += 1) {
        row[j] = -a[n - 1 - j];
      }
    }
    return row;
  });

  const B = Array(n).fill(0);
  B[n - 1] = 1;

  const C = Array(n).fill(0);
  const b0 = b[0] || 0;
  for (let i = 0; i < n; i += 1) {
    const bi = b[i + 1] || 0;
    const ai = a[i] || 0;
    C[n - 1 - i] = bi - ai * b0;
  }

  const D = b0;
  const state = Array(n).fill(0);
  return { n, A, B, C, D, state };
};

export const buildDiscreteTf = (num, den) => {
  const { trimmed: numArr } = normalizePoly(num);
  const { trimmed: denArr, allZero: denAllZero } = normalizePoly(den);
  const safeDen = denAllZero ? [1] : denArr;
  const a0 = safeDen[0] || 1;
  const denNorm = safeDen.map((v) => v / a0);
  const numNorm = (numArr.length ? numArr : [0]).map((v) => v / a0);
  return { num: numNorm, den: denNorm };
};

export const evalDiscreteTf = (model, xHist, yHist) => {
  const num = model.num || [0];
  const den = model.den || [1];
  let y = 0;
  for (let i = 0; i < num.length; i += 1) {
    y += (num[i] || 0) * (xHist[i] || 0);
  }
  for (let i = 1; i < den.length; i += 1) {
    y -= (den[i] || 0) * (yHist[i - 1] || 0);
  }
  return y;
};

export const outputFromState = (model, state, input) => {
  if (model.n === 0) return model.D * input;
  return dot(model.C, state) + model.D * input;
};

export const integrateTfRK4 = (model, state, input, dt) => {
  if (model.n === 0) return state;
  const k1 = stateDerivative(model, state, input);
  const k2 = stateDerivative(model, addVec(state, scaleVec(k1, dt / 2)), input);
  const k3 = stateDerivative(model, addVec(state, scaleVec(k2, dt / 2)), input);
  const k4 = stateDerivative(model, addVec(state, scaleVec(k3, dt)), input);
  const sum = addVec(addVec(k1, scaleVec(k2, 2)), addVec(scaleVec(k3, 2), k4));
  return addVec(state, scaleVec(sum, dt / 6));
};

export const getBlockState = (ctx, block) => {
  let state = ctx.blockState.get(block.id);
  if (!state) {
    state = {};
    ctx.blockState.set(block.id, state);
  }
  return state;
};

export const getInputValue = (ctx, block, idx, fallback = 0) => {
  const inputs = ctx.inputMap.get(block.id) || [];
  const fromId = inputs[idx];
  if (!fromId) return fallback;
  const val = ctx.outputs.get(fromId);
  return val ?? fallback;
};

export const getInputValues = (ctx, block) => {
  const inputs = ctx.inputMap.get(block.id) || [];
  return inputs.map((fromId) => (fromId ? ctx.outputs.get(fromId) : undefined));
};

const stateDerivative = (model, state, input) => {
  const Ax = matVec(model.A, state);
  const Bu = model.B.map((v) => v * input);
  return addVec(Ax, Bu);
};

const matVec = (mat, vec) => mat.map((row) => row.reduce((acc, v, i) => acc + v * (vec[i] || 0), 0));

const dot = (a, b) => a.reduce((acc, v, i) => acc + v * (b[i] || 0), 0);

const addVec = (a, b) => a.map((v, i) => v + (b[i] || 0));

const scaleVec = (vec, scalar) => vec.map((v) => v * scalar);
