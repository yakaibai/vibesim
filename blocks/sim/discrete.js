import { buildDiscreteTf, evalDiscreteTf, getInputValue, getBlockState } from "./helpers.js";

export const discreteSimHandlers = {
  zoh: {
    init: (ctx, block) => {
      const state = getBlockState(ctx, block);
      state.zoh = { lastSample: 0, nextTime: 0 };
      state.output = 0;
    },
    output: (ctx, block) => {
      const state = getBlockState(ctx, block);
      ctx.outputs.set(block.id, state.output ?? 0);
    },
    update: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const inputVal = getInputValue(ctx, block, 0, 0);
      const state = getBlockState(ctx, block).zoh;
      const ts = Math.max(0.001, Number(params.ts) || ctx.dt);
      if (ctx.t + 1e-6 >= state.nextTime) {
        state.lastSample = inputVal ?? 0;
        state.nextTime = ctx.t + ts;
      }
      getBlockState(ctx, block).output = state.lastSample;
    },
  },
  foh: {
    init: (ctx, block) => {
      const state = getBlockState(ctx, block);
      state.foh = { prevSample: 0, lastSample: 0, lastTime: 0, nextTime: 0 };
      state.output = 0;
    },
    output: (ctx, block) => {
      const state = getBlockState(ctx, block);
      ctx.outputs.set(block.id, state.output ?? 0);
    },
    update: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const inputVal = getInputValue(ctx, block, 0, 0);
      const state = getBlockState(ctx, block).foh;
      const ts = Math.max(0.001, Number(params.ts) || ctx.dt);
      if (ctx.t + 1e-6 >= state.nextTime) {
        state.prevSample = state.lastSample;
        state.lastSample = inputVal ?? 0;
        state.lastTime = ctx.t;
        state.nextTime = ctx.t + ts;
      }
      const slope = (state.lastSample - state.prevSample) / ts;
      const out = state.lastSample + slope * (ctx.t - state.lastTime);
      getBlockState(ctx, block).output = out;
    },
  },
  dtf: {
    init: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const model = buildDiscreteTf(params.num, params.den);
      const state = getBlockState(ctx, block);
      state.dtf = {
        model,
        xHist: Array(model.num.length).fill(0),
        yHist: Array(model.den.length - 1).fill(0),
        nextTime: 0,
      };
      state.output = 0;
    },
    output: (ctx, block) => {
      const state = getBlockState(ctx, block);
      ctx.outputs.set(block.id, state.output ?? 0);
    },
    update: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const inputVal = getInputValue(ctx, block, 0, 0);
      const state = getBlockState(ctx, block).dtf;
      const ts = Math.max(0.001, Number(params.ts) || ctx.dt);
      if (ctx.t + 1e-6 >= state.nextTime) {
        state.xHist.pop();
        state.xHist.unshift(inputVal ?? 0);
        const y = evalDiscreteTf(state.model, state.xHist, state.yHist);
        state.yHist.pop();
        state.yHist.unshift(y);
        state.nextTime = ctx.t + ts;
        getBlockState(ctx, block).output = y;
      }
    },
  },
  ddelay: {
    init: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const steps = Math.max(1, Math.round(Number(params.steps) || 1));
      const ts = Math.max(0.001, Number(params.ts) || 0.1);
      const state = getBlockState(ctx, block);
      state.ddelay = { queue: Array(steps).fill(0), nextTime: 0, lastOut: 0, ts };
      state.output = 0;
    },
    output: (ctx, block) => {
      const state = getBlockState(ctx, block);
      ctx.outputs.set(block.id, state.output ?? 0);
    },
    update: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const inputVal = getInputValue(ctx, block, 0, 0);
      const state = getBlockState(ctx, block).ddelay;
      const steps = Math.max(1, Math.round(Number(params.steps) || 1));
      const ts = Math.max(0.001, Number(params.ts) || state.ts || 0.1);
      state.ts = ts;
      if (ctx.t + 1e-6 >= state.nextTime) {
        state.queue.push(inputVal ?? 0);
        while (state.queue.length > steps) state.queue.shift();
        state.lastOut = state.queue[0] ?? 0;
        state.nextTime = ctx.t + ts;
      }
      getBlockState(ctx, block).output = state.lastOut ?? 0;
    },
  },
  dstateSpace: {
    init: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const ts = Math.max(0.001, Number(params.ts) || 0.1);
      const state = getBlockState(ctx, block);
      state.dstateSpace = { x: 0, nextTime: 0, lastOut: 0, ts };
      state.output = 0;
    },
    output: (ctx, block) => {
      const state = getBlockState(ctx, block);
      ctx.outputs.set(block.id, state.output ?? 0);
    },
    update: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const inputVal = getInputValue(ctx, block, 0, 0);
      const state = getBlockState(ctx, block).dstateSpace;
      if (!state) return;
      const A = Number(params.A) || 0;
      const B = Number(params.B) || 0;
      const C = Number(params.C) || 0;
      const D = Number(params.D) || 0;
      const ts = Math.max(0.001, Number(params.ts) || state.ts || 0.1);
      state.ts = ts;
      if (ctx.t + 1e-9 >= state.nextTime) {
        const xNext = A * state.x + B * (inputVal ?? 0);
        state.x = xNext;
        const y = C * xNext + D * (inputVal ?? 0);
        state.lastOut = y;
        state.nextTime = ctx.t + ts;
        getBlockState(ctx, block).output = y;
      } else {
        getBlockState(ctx, block).output = state.lastOut ?? 0;
      }
    },
  },
};
