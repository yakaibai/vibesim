import { getBlockState, getInputValues, getInputValue } from "./helpers.js";

export const nonlinearSimHandlers = {
  saturation: {
    algebraic: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const values = getInputValues(ctx, block);
      if (values[0] === undefined) return null;
      const min = Number(params.min);
      const max = Number(params.max);
      const value = values[0] ?? 0;
      const out = Math.max(min, Math.min(max, value));
      const prev = ctx.outputs.get(block.id);
      ctx.outputs.set(block.id, out);
      return { updated: prev !== out && !(Number.isNaN(prev) && Number.isNaN(out)) };
    },
  },
  rate: {
    init: (ctx, block) => {
      const state = getBlockState(ctx, block);
      state.rate = 0;
    },
    output: (ctx, block) => {
      const state = getBlockState(ctx, block);
      const prev = state.rate ?? 0;
      ctx.outputs.set(block.id, prev);
    },
    update: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const inputVal = getInputValue(ctx, block, 0, 0);
      const state = getBlockState(ctx, block);
      const prev = state.rate ?? 0;
      const rise = Math.max(0, Number(params.rise));
      const fall = Math.max(0, Number(params.fall));
      const maxRise = prev + rise * ctx.dt;
      const maxFall = prev - fall * ctx.dt;
      state.rate = Math.min(maxRise, Math.max(maxFall, inputVal));
    },
  },
  backlash: {
    init: (ctx, block) => {
      const state = getBlockState(ctx, block);
      state.backlash = 0;
      state.output = 0;
    },
    output: (ctx, block) => {
      const state = getBlockState(ctx, block);
      ctx.outputs.set(block.id, state.output ?? 0);
    },
    update: (ctx, block) => {
      const params = ctx.resolvedParams.get(block.id) || {};
      const inputVal = getInputValue(ctx, block, 0, 0);
      const width = Math.max(0, Number(params.width) || 0);
      const state = getBlockState(ctx, block);
      const prev = state.backlash ?? 0;
      let out = prev;
      if ((inputVal ?? 0) > prev + width / 2) out = (inputVal ?? 0) - width / 2;
      if ((inputVal ?? 0) < prev - width / 2) out = (inputVal ?? 0) + width / 2;
      state.backlash = out;
      state.output = out;
    },
  },
};
