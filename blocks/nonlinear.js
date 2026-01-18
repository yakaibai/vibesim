export const nonlinearLibrary = {
  id: "nonlinear",
  title: "Nonlinear",
  blocks: [
    { type: "saturation", label: "Saturation" },
    { type: "rate", label: "Rate Limit" },
    { type: "backlash", label: "Backlash" },
  ],
};

export const createNonlinearTemplates = (helpers) => {
  const { renderCenteredAxesPlot, createSvgElement } = helpers;
  return {
    saturation: {
      width: 80,
      height: 80,
      inputs: [{ x: 0, y: 40, side: "left" }],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { min: -1, max: 1 },
      render: (block) => {
        const axisLeft = 14;
        const axisRight = block.width - 14;
        const axisTop = 14;
        const axisBottom = block.height - 14;
        const midX = (axisLeft + axisRight) / 2;
        const midY = (axisTop + axisBottom) / 2;
        const flatY = midY - 16;
        const lowY = midY + 16;
        const leftX = axisLeft + 6;
        const rightX = axisRight - 6;
        const satPath = `M${leftX} ${lowY} L${midX - 10} ${lowY} L${midX + 10} ${flatY} L${rightX} ${flatY}`;
        renderCenteredAxesPlot(block.group, block.width, block.height, satPath);
      },
    },
    rate: {
      width: 80,
      height: 80,
      inputs: [{ x: 0, y: 40, side: "left" }],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { rise: 1, fall: 1 },
      render: (block) => {
        const axisLeft = 14;
        const axisRight = block.width - 14;
        const axisTop = 14;
        const axisBottom = block.height - 14;
        const midX = (axisLeft + axisRight) / 2;
        const midY = (axisTop + axisBottom) / 2;
        const leftX = axisLeft + 6;
        const rightX = axisRight - 6;
        const curveEndX = midX + 6;
        const curveEndY = midY - 8;
        const dashedPath = `M${leftX} ${midY + 14} C${leftX + 6} ${midY + 10} ${midX - 4} ${midY + 2} ${curveEndX} ${curveEndY}`;
        const solidPath = `M${leftX} ${midY + 14} C${leftX + 8} ${midY + 10} ${midX - 2} ${midY + 2} ${curveEndX} ${curveEndY} L${rightX} ${midY - 14}`;
        renderCenteredAxesPlot(block.group, block.width, block.height, null);
        block.group.appendChild(
          createSvgElement("path", {
            d: dashedPath,
            class: "source-plot dashed-plot",
          })
        );
        block.group.appendChild(
          createSvgElement("path", {
            d: solidPath,
            class: "source-plot",
          })
        );
      },
    },
    backlash: {
      width: 80,
      height: 80,
      inputs: [{ x: 0, y: 40, side: "left" }],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { width: 1 },
      render: (block) => {
        const axisLeft = 14;
        const axisRight = block.width - 14;
        const axisTop = 14;
        const axisBottom = block.height - 14;
        const midX = (axisLeft + axisRight) / 2;
        const midY = (axisTop + axisBottom) / 2;
        const leftX = axisLeft + 6;
        const rightX = axisRight - 6;
        const gap = 8;
        const slope = 10;
        const lowY = midY + slope;
        const highY = midY - slope;
        const lowerPath = `M${leftX} ${lowY} L${midX - gap} ${lowY} L${midX + gap} ${highY} L${rightX} ${highY}`;
        const upperPath = `M${leftX} ${lowY + 6} L${midX - gap} ${lowY + 6} L${midX + gap} ${highY + 6} L${rightX} ${highY + 6}`;
        renderCenteredAxesPlot(block.group, block.width, block.height, null);
        block.group.appendChild(
          createSvgElement("path", { d: lowerPath, class: "source-plot" })
        );
        block.group.appendChild(
          createSvgElement("path", { d: upperPath, class: "source-plot" })
        );
      },
    },
  };
};
