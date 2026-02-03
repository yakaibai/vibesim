export const sinkLibrary = {
  id: "sink",
  title: "Sink",
  blocks: [
    { type: "scope", label: "Scope" },
    { type: "fileSink", label: "Output File" },
    { type: "labelSink", label: "Label" },
  ],
};

export const createSinkTemplates = (helpers) => {
  const { svgRect, createSvgElement, svgText, renderLabelNode } = helpers;
  return {
    scope: {
      width: 220,
      height: 160,
      inputs: [
        { x: 0, y: 40, side: "left" },
        { x: 0, y: 80, side: "left" },
        { x: 0, y: 120, side: "left" },
      ],
      outputs: [],
      defaultParams: { tMin: "", tMax: "", yMin: "", yMax: "", width: 220, height: 160 },
      render: (block) => {
        const group = block.group;
        const body = svgRect(0, 0, block.width, block.height, "block-body");
        group.appendChild(body);
        const title = svgText(10, 20, "Scope");
        group.appendChild(title);
        block.bodyRect = body;
        block.scopeTitle = title;
        const plotHeight = block.height - 40;
        const plot = svgRect(10, 30, block.width - 20, plotHeight, "scope-plot");
        group.appendChild(plot);
        const defs = createSvgElement("defs");
        const clipId = `scope-clip-${block.id}`;
        const clipRect = createSvgElement("rect", {
          x: plot.getAttribute("x"),
          y: plot.getAttribute("y"),
          width: plot.getAttribute("width"),
          height: plot.getAttribute("height"),
        });
        const clipPath = createSvgElement("clipPath", { id: clipId });
        clipPath.appendChild(clipRect);
        defs.appendChild(clipPath);
        group.appendChild(defs);
        const axesGroup = createSvgElement("g", { class: "scope-axes" });
        const xAxis = createSvgElement("line", { class: "scope-axis" });
        const yAxis = createSvgElement("line", { class: "scope-axis" });
        axesGroup.appendChild(xAxis);
        axesGroup.appendChild(yAxis);
        const xTicks = Array.from({ length: 9 }, () => createSvgElement("line", { class: "scope-tick" }));
        const yTicks = Array.from({ length: 9 }, () => createSvgElement("line", { class: "scope-tick" }));
        xTicks.forEach((tick) => axesGroup.appendChild(tick));
        yTicks.forEach((tick) => axesGroup.appendChild(tick));
        group.appendChild(axesGroup);
        const pathsGroup = createSvgElement("g", { class: "scope-paths", "clip-path": `url(#${clipId})` });
        group.appendChild(pathsGroup);
        const colors = ["scope-path-1", "scope-path-2", "scope-path-3"];
        block.scopePaths = colors.map((cls) => {
          const path = createSvgElement("path", { class: `scope-path ${cls}` });
          pathsGroup.appendChild(path);
          return path;
        });
        block.scopePlot = plot;
        block.scopeAxes = { xAxis, yAxis, xTicks, yTicks };
        block.scopeClipRect = clipRect;
        const hintColors = ["#f6d63b", "#d35cff", "#35d1ff"];
        const hintRadius = 3;
        block.scopeInputHints = hintColors.map((color) => {
          const hint = createSvgElement("circle", {
            cx: 8,
            cy: 40,
            r: hintRadius,
            fill: color,
            class: "scope-input-hint",
          });
          group.appendChild(hint);
          return hint;
        });
      },
    },
    fileSink: {
      width: 80,
      height: 80,
      inputs: [{ x: 0, y: 40, side: "left" }],
      outputs: [],
      defaultParams: { path: "output.csv" },
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
            "OUT"
          )
        );
      },
    },
    labelSink: {
      width: 40,
      height: 40,
      inputs: [{ x: 0, y: 20, side: "left" }],
      outputs: [],
      defaultParams: { name: "x", showNode: true },
      render: (block) => {
        const showNode = block.params.showNode !== false;
        renderLabelNode(block, block.params.name, { showNode });
        if (showNode) {
          block.group.appendChild(createSvgElement("line", { x1: 15, y1: 20, x2: 0, y2: 20, class: "label-node" }));
        }
      },
    },
  };
};
