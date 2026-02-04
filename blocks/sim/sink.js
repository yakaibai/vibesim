export const sinkSimHandlers = {
  scope: {
    init: (ctx, block) => {
      const inputs = ctx.inputMap.get(block.id) || [];
      const state = ctx.blockState.get(block.id) || {};
      state.scopeSeries = Array(block.inputs).fill(0).map(() => []);
      state.scopeConnected = inputs.map((fromId) => Boolean(fromId));
      ctx.blockState.set(block.id, state);
    },
    afterStep: (ctx, block) => {
      const state = ctx.blockState.get(block.id);
      if (!state?.scopeSeries) return;
      const inputs = ctx.inputMap.get(block.id) || [];
      inputs.forEach((fromId, idx) => {
        const value = fromId ? ctx.outputs.get(fromId) : null;
        state.scopeSeries[idx].push(value ?? null);
      });
    },
  },
  xyScope: {
    init: (ctx, block) => {
      const inputs = ctx.inputMap.get(block.id) || [];
      const state = ctx.blockState.get(block.id) || {};
      state.xySeries = { x: [], y: [] };
      state.xyConnected = inputs.map((fromId) => Boolean(fromId));
      ctx.blockState.set(block.id, state);
    },
    afterStep: (ctx, block) => {
      const state = ctx.blockState.get(block.id);
      if (!state?.xySeries) return;
      const inputs = ctx.inputMap.get(block.id) || [];
      const xId = inputs[0];
      const yId = inputs[1];
      const xVal = xId ? ctx.outputs.get(xId) : null;
      const yVal = yId ? ctx.outputs.get(yId) : null;
      state.xySeries.x.push(xVal ?? null);
      state.xySeries.y.push(yVal ?? null);
    },
  },
  fileSink: {
    init: (ctx, block) => {
      const state = ctx.blockState.get(block.id) || {};
      state.fileSinkSeries = { time: [], values: [] };
      ctx.blockState.set(block.id, state);
      block.params.lastCsv = "";
    },
    afterStep: (ctx, block) => {
      const inputs = ctx.inputMap.get(block.id) || [];
      const fromId = inputs[0];
      const value = fromId ? ctx.outputs.get(fromId) : null;
      const state = ctx.blockState.get(block.id);
      if (!state?.fileSinkSeries) return;
      state.fileSinkSeries.time.push(ctx.t);
      state.fileSinkSeries.values.push(value ?? 0);
    },
    finalize: (ctx, block) => {
      const state = ctx.blockState.get(block.id);
      if (!state?.fileSinkSeries) return;
      const rows = ["t,value"];
      for (let i = 0; i < state.fileSinkSeries.time.length; i += 1) {
        rows.push(`${state.fileSinkSeries.time[i]},${state.fileSinkSeries.values[i]}`);
      }
      block.params.lastCsv = rows.join("\n");
    },
  },
  labelSink: {
    init: (ctx, block) => {
      const name = String(block.params.name || "").trim();
      if (name) ctx.labelSinks.set(name, block.id);
    },
  },
};
