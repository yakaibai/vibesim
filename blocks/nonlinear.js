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
        const yStart = midY + 16;
        const yEnd = midY - 16;
        const dashedC1X = leftX + (rightX - leftX) * 0.2;
        const dashedC2X = leftX + (rightX - leftX) * 0.85;
        const dashedC1Y = yStart - 1;
        const dashedC2Y = yEnd + 12;
        const tBreak = 0.55;
        const omt = 1 - tBreak;
        const omt2 = omt * omt;
        const omt3 = omt2 * omt;
        const t2 = tBreak * tBreak;
        const t3 = t2 * tBreak;
        const breakX =
          omt3 * leftX +
          3 * omt2 * tBreak * dashedC1X +
          3 * omt * t2 * dashedC2X +
          t3 * rightX;
        const breakY =
          omt3 * yStart +
          3 * omt2 * tBreak * dashedC1Y +
          3 * omt * t2 * dashedC2Y +
          t3 * yEnd;
        const solidEndY = midY - 6;
        const dashedPath = `M${leftX} ${yStart} C${dashedC1X} ${dashedC1Y} ${dashedC2X} ${dashedC2Y} ${rightX} ${yEnd}`;
        const solidPath = `M${leftX} ${yStart} C${dashedC1X} ${dashedC1Y} ${dashedC2X} ${dashedC2Y} ${breakX} ${breakY} L${rightX} ${solidEndY}`;
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
        const mapX = (val) => midX + val * ((axisRight - axisLeft) / 2);
        const mapY = (val) => midY - val * ((axisBottom - axisTop) / 2);
        const line1 = { x1: -0.9, y1: -0.9, x2: -0.1, y2: 0.4 };
        const line2 = { x1: 0.1, y1: -0.4, x2: 0.9, y2: 0.9 };
        const solveX = (line, y) => {
          const dy = line.y2 - line.y1;
          if (Math.abs(dy) < 1e-6) return line.x1;
          return line.x1 + ((y - line.y1) * (line.x2 - line.x1)) / dy;
        };
        renderCenteredAxesPlot(block.group, block.width, block.height, null);
        block.group.appendChild(
          createSvgElement("line", {
            x1: mapX(line1.x1),
            y1: mapY(line1.y1),
            x2: mapX(line1.x2),
            y2: mapY(line1.y2),
            class: "source-plot",
          })
        );
        block.group.appendChild(
          createSvgElement("line", {
            x1: mapX(line2.x1),
            y1: mapY(line2.y1),
            x2: mapX(line2.x2),
            y2: mapY(line2.y2),
            class: "source-plot",
          })
        );
        const ys = [-0.4, -0.3, 0.3, 0.4];
        ys.forEach((y) => {
          const xLeft = solveX(line1, y);
          const xRight = solveX(line2, y);
          block.group.appendChild(
            createSvgElement("line", {
              x1: mapX(xLeft),
              y1: mapY(y),
              x2: mapX(xRight),
              y2: mapY(y),
              class: "source-plot",
            })
          );
        });
      },
    },
  };
};
