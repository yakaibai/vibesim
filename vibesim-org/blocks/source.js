export const sourceLibrary = {
  id: "source",
  title: "Source",
  blocks: [
    { type: "constant", label: "Constant" },
    { type: "step", label: "Step" },
    { type: "ramp", label: "Ramp" },
    { type: "impulse", label: "Impulse" },
    { type: "sine", label: "Sine" },
    { type: "chirp", label: "Chirp" },
    { type: "noise", label: "Noise" },
    { type: "fileSource", label: "File" },
    { type: "labelSource", label: "Label" },
  ],
};

export const createSourceTemplates = (helpers) => {
  const {
    svgRect,
    createSvgElement,
    renderTeXMath,
    renderSourcePlot,
    renderLabelNode,
  } = helpers;
  return {
    constant: {
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { value: 1 },
      render: (block) => {
        const group = block.group;
        group.appendChild(svgRect(0, 0, block.width, block.height, "block-body"));
        const mathGroup = createSvgElement("g", { class: "constant-math" });
        group.appendChild(mathGroup);
        renderTeXMath(mathGroup, `${block.params.value}`, block.width, block.height);
      },
    },
    step: {
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { stepTime: 0 },
      render: (block) => {
        const axisX = 14;
        const axisY = block.height - 16;
        const axisTop = 14;
        const axisRight = block.width - 14;
        const baseline = axisY - 6;
        const stepPath = `M${axisX} ${baseline} H${axisX + 16} V${axisTop + 8} H${axisRight - 4}`;
        renderSourcePlot(block.group, block.width, block.height, stepPath);
      },
    },
    ramp: {
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { slope: 1, start: 0 },
      render: (block) => {
        const axisX = 14;
        const axisY = block.height - 16;
        const axisTop = 14;
        const axisRight = block.width - 14;
        const baseline = axisY - 6;
        const rampPath = `M${axisX} ${baseline} L${axisRight - 4} ${axisTop + 8}`;
        renderSourcePlot(block.group, block.width, block.height, rampPath);
      },
    },
    impulse: {
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { time: 0, amp: 1 },
      render: (block) => {
        const axisX = 14;
        const axisY = block.height - 16;
        const axisTop = 14;
        const baseline = axisY - 6;
        const spikeX = axisX + 22;
        const impulsePath = `M${axisX} ${baseline} H${spikeX - 2} V${axisTop + 6} H${spikeX + 2} V${baseline} H${block.width - 18}`;
        renderSourcePlot(block.group, block.width, block.height, impulsePath);
      },
    },
    sine: {
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { amp: 1, freq: 1, phase: 0 },
      render: (block) => {
        const axisX = 14;
        const axisY = block.height - 16;
        const axisTop = 14;
        const axisRight = block.width - 14;
        const midY = (axisY + axisTop) / 2;
        const amp = (axisY - axisTop) / 3;
        const w = axisRight - axisX - 4;
        const sinePath = `M${axisX} ${midY}
        C${axisX + w * 0.25} ${midY - amp}, ${axisX + w * 0.25} ${midY - amp}, ${axisX + w * 0.5} ${midY}
        C${axisX + w * 0.75} ${midY + amp}, ${axisX + w * 0.75} ${midY + amp}, ${axisX + w} ${midY}`;
        renderSourcePlot(block.group, block.width, block.height, sinePath);
      },
    },
    chirp: {
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { amp: 1, f0: 1, f1: 5, t1: 10 },
      render: (block) => {
        const axisX = 14;
        const axisY = block.height - 16;
        const axisTop = 14;
        const axisRight = block.width - 14;
        const midY = (axisY + axisTop) / 2;
        const amp = (axisY - axisTop) / 3;
        const w = axisRight - axisX - 4;
        const chirpPath = `M${axisX} ${midY}
        C${axisX + w * 0.18} ${midY - amp}, ${axisX + w * 0.18} ${midY - amp}, ${axisX + w * 0.3} ${midY}
        C${axisX + w * 0.42} ${midY + amp}, ${axisX + w * 0.42} ${midY + amp}, ${axisX + w * 0.54} ${midY}
        C${axisX + w * 0.62} ${midY - amp}, ${axisX + w * 0.62} ${midY - amp}, ${axisX + w * 0.7} ${midY}
        C${axisX + w * 0.76} ${midY + amp}, ${axisX + w * 0.76} ${midY + amp}, ${axisX + w * 0.82} ${midY}
        C${axisX + w * 0.86} ${midY - amp}, ${axisX + w * 0.86} ${midY - amp}, ${axisX + w * 0.9} ${midY}
        C${axisX + w * 0.93} ${midY + amp}, ${axisX + w * 0.93} ${midY + amp}, ${axisX + w * 0.96} ${midY}
        C${axisX + w * 0.98} ${midY - amp}, ${axisX + w * 0.98} ${midY - amp}, ${axisX + w} ${midY}`;
        renderSourcePlot(block.group, block.width, block.height, chirpPath);
      },
    },
    noise: {
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { amp: 1 },
      render: (block) => {
        const axisX = 14;
        const axisY = block.height - 16;
        const axisTop = 14;
        const axisRight = block.width - 14;
        const minX = axisX + 2;
        const maxX = axisRight - 2;
        const minY = axisTop + 2;
        const maxY = axisY - 2;
        const midY = (minY + maxY) / 2;
        const amp = (maxY - minY) / 2;
        const offsets = [0, -0.2, 0.6, -0.9, 0.3, -0.7, 0.95, -0.4, 0.8, -0.95, 0.5, -0.6, 0.9, -0.3, 0.7, -0.85, 0.4];
        const step = (maxX - minX) / (offsets.length - 1);
        const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
        const points = offsets.map((val, idx) => {
          const x = clamp(minX + idx * step, minX, maxX);
          const y = clamp(midY + val * amp, minY, maxY);
          return { x, y };
        });
        const noisePath = points
          .map((pt, idx) => `${idx === 0 ? "M" : "L"}${pt.x} ${pt.y}`)
          .join(" ");
        renderSourcePlot(block.group, block.width, block.height, noisePath);
      },
    },
    fileSource: {
      width: 80,
      height: 80,
      inputs: [],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { path: "signal.csv" },
      render: (block) => {
        const group = block.group;
        group.appendChild(svgRect(0, 0, block.width, block.height, "block-body"));
        const iconW = 44;
        const iconH = 54;
        const x = (block.width - iconW) / 2;
        const y = (block.height - iconH) / 2;
        const fold = 12;
        group.appendChild(
          createSvgElement("path", {
            d: [
              `M${x} ${y}`,
              `H${x + iconW - fold}`,
              `L${x + iconW} ${y + fold}`,
              `V${y + iconH}`,
              `H${x}`,
              "Z",
            ].join(" "),
            class: "file-icon-stroke",
          })
        );
        group.appendChild(
          createSvgElement("polyline", {
            points: `${x + iconW - fold},${y} ${x + iconW - fold},${y + fold} ${x + iconW},${y + fold}`,
            class: "file-icon-stroke",
          })
        );
        group.appendChild(
          createSvgElement(
            "text",
            { x: block.width / 2, y: block.height / 2 + 4, class: "file-icon-label upright", "text-anchor": "middle" },
            "IN"
          )
        );
      },
    },
    labelSource: {
      width: 40,
      height: 40,
      inputs: [],
      outputs: [{ x: 40, y: 20, side: "right" }],
      defaultParams: { name: "x" },
      render: (block) => {
        renderLabelNode(block, block.params.name);
        block.group.appendChild(createSvgElement("line", { x1: 25, y1: 20, x2: 40, y2: 20, class: "label-node" }));
      },
    },
  };
};
