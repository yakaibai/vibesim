export const discreteLibrary = {
  id: "discrete",
  title: "Discrete",
  blocks: [
    { type: "zoh", label: "ZOH" },
    { type: "foh", label: "FOH" },
    { type: "dtf", label: "Discrete TF" },
    { type: "ddelay", label: "Discrete Delay" },
    { type: "dstateSpace", label: "Discrete State Space" },
  ],
};

export const createDiscreteTemplates = (helpers) => {
  const { svgRect, createSvgElement, renderTeXMath, buildTransferTeX } = helpers;
  return {
    zoh: {
      width: 80,
      height: 80,
      inputs: [{ x: 0, y: 40, side: "left" }],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { ts: 0.1 },
      render: (block) => {
        const group = block.group;
        group.appendChild(svgRect(0, 0, block.width, block.height, "block-body"));
        const mathGroup = createSvgElement("g", { class: "zoh-math" });
        group.appendChild(mathGroup);
        renderTeXMath(mathGroup, "\\mathsf{ZOH}", block.width, block.height);
      },
    },
    foh: {
      width: 80,
      height: 80,
      inputs: [{ x: 0, y: 40, side: "left" }],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { ts: 0.1 },
      render: (block) => {
        const group = block.group;
        group.appendChild(svgRect(0, 0, block.width, block.height, "block-body"));
        const mathGroup = createSvgElement("g", { class: "foh-math" });
        group.appendChild(mathGroup);
        renderTeXMath(mathGroup, "\\mathsf{FOH}", block.width, block.height);
      },
    },
    dtf: {
      width: 140,
      height: 80,
      inputs: [{ x: 0, y: 40, side: "left" }],
      outputs: [{ x: 140, y: 40, side: "right" }],
      defaultParams: { num: [1], den: [1, -0.5], ts: 0.1 },
      render: (block) => {
        const group = block.group;
        group.appendChild(svgRect(0, 0, block.width, block.height, "block-body"));
        const mathGroup = createSvgElement("g", { class: "dtf-math" });
        group.appendChild(mathGroup);
        renderTeXMath(
          mathGroup,
          buildTransferTeX(block.params.num, block.params.den, "z"),
          block.width,
          block.height
        );
      },
    },
    dstateSpace: {
      width: 200,
      height: 80,
      inputs: [{ x: 0, y: 40, side: "left" }],
      outputs: [{ x: 200, y: 40, side: "right" }],
      defaultParams: { A: 1, B: 1, C: 1, D: 0, ts: 0.1 },
      render: (block) => {
        const group = block.group;
        group.appendChild(svgRect(0, 0, block.width, block.height, "block-body"));
        const mathGroup = createSvgElement("g", { class: "dss-math" });
        group.appendChild(mathGroup);
        renderTeXMath(
          mathGroup,
          "\\begin{aligned}x_{k+1}&=Ax_k+Bu_k\\\\y_k&=Cx_k+Du_k\\end{aligned}",
          block.width,
          block.height
        );
      },
    },
    ddelay: {
      width: 80,
      height: 80,
      inputs: [{ x: 0, y: 40, side: "left" }],
      outputs: [{ x: 80, y: 40, side: "right" }],
      defaultParams: { steps: 1, ts: 0.1 },
      render: (block) => {
        const group = block.group;
        group.appendChild(svgRect(0, 0, block.width, block.height, "block-body"));
        const mathGroup = createSvgElement("g", { class: "ddelay-math" });
        group.appendChild(mathGroup);
        renderTeXMath(mathGroup, "z^{-1}", block.width, block.height);
      },
    },
  };
};
