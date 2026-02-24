import { buildBlockTemplates } from "../blocks/index.js";
import { state } from "./state.js";
import { parseVariables } from "../utils/expr.js";
import { getViewBox as getWorkspaceViewBox, getZoomScale as getWorkspaceZoomScale } from "./workspace-handlers.js";

let blockLibraryGroups = null;
let blockLibrary = null;
let GRID_SIZE = 20;
let rendererRef = null;
let statusEl = null;

export function setBlockLibraryGroups(el) {
  blockLibraryGroups = el;
}

export function setBlockLibrary(lib) {
  blockLibrary = lib;
}

export function setGridSize(size) {
  GRID_SIZE = size;
}

export function setRendererRef(ref) {
  rendererRef = ref;
}

export function setStatusEl(el) {
  statusEl = el;
}

export function getBlockLibraryGroups() {
  return blockLibraryGroups;
}

export function getBlockLibrary() {
  return blockLibrary;
}

export function getGridSize() {
  return GRID_SIZE;
}

export function renderBlockLibrary() {
  console.log('renderBlockLibrary() - blockLibraryGroups:', blockLibraryGroups);
  if (!blockLibraryGroups) return;
  blockLibraryGroups.innerHTML = "";
  const groups = [...blockLibrary];
  console.log('renderBlockLibrary() - groups:', groups);
  
  const helpers = {
    GRID_SIZE,
    svgRect: (x, y, w, h, cls) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      el.setAttribute("x", String(x));
      el.setAttribute("y", String(y));
      el.setAttribute("width", String(Math.max(0, w)));
      el.setAttribute("height", String(Math.max(0, h)));
      el.setAttribute("class", cls);
      return el;
    },
    svgText: (x, y, text) => {
      return helpers.createSvgElement("text", { x, y, class: "block-text upright" }, text);
    },
    createSvgElement: (tag, attrs = {}, text = "") => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attrs).forEach(([key, value]) => {
        el.setAttribute(key, String(value));
      });
      if (text) el.textContent = text;
      return el;
    },
    renderTeXMath: (group, tex, width, height) => {
      group.innerHTML = "";
      const foreign = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
      foreign.setAttribute("x", "0");
      foreign.setAttribute("y", "0");
      foreign.setAttribute("width", String(width));
      foreign.setAttribute("height", String(height));
      foreign.setAttribute("class", "upright");
      const div = document.createElement("div");
      div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      div.className = "math-foreign";
      const span = document.createElement("span");
      span.className = "katex-target";
      span.dataset.tex = tex;
      span.style.whiteSpace = "nowrap";
      if (window.katex && typeof window.katex.render === "function") {
        try {
          window.katex.render(tex, span, { throwOnError: false });
          span.classList.remove("katex-target");
        } catch {
          span.textContent = tex;
        }
      } else {
        span.textContent = tex;
      }
      div.appendChild(span);
      foreign.appendChild(div);
      group.appendChild(foreign);
    },
    renderSourcePlot: (group, width, height, plotPath) => {
      group.appendChild(helpers.svgRect(0, 0, width, height, "block-body"));
      const padding = Math.min(4, width * 0.05, height * 0.05);
      const axisX = padding;
      const axisY = height - padding;
      const axisTop = padding;
      const axisRight = width - padding;
      if (axisY > axisTop && axisRight > axisX) {
        group.appendChild(
          helpers.createSvgElement("line", {
            x1: axisX,
            y1: axisY,
            x2: axisRight,
            y2: axisY,
            class: "axis",
          })
        );
        group.appendChild(
          helpers.createSvgElement("line", {
            x1: axisX,
            y1: axisY,
            x2: axisX,
            y2: axisTop,
            class: "axis",
          })
        );
      }
      if (plotPath) {
        group.appendChild(
          helpers.createSvgElement("path", {
            d: plotPath,
            class: "plot",
          })
        );
      }
    },
    renderCenteredAxesPlot: (group, width, height, plotPath) => {
      group.appendChild(helpers.svgRect(0, 0, width, height, "block-body"));
      const padding = Math.min(4, width * 0.05, height * 0.05);
      const axisX = padding;
      const axisY = height - padding;
      const axisTop = padding;
      const axisRight = width - padding;
      if (axisY > axisTop && axisRight > axisX) {
        group.appendChild(
          helpers.createSvgElement("line", {
            x1: axisX,
            y1: axisY,
            x2: axisRight,
            y2: axisY,
            class: "axis",
          })
        );
        group.appendChild(
          helpers.createSvgElement("line", {
            x1: axisX,
            y1: axisY,
            x2: axisX,
            y2: axisTop,
            class: "axis",
          })
        );
      }
      if (plotPath) {
        group.appendChild(
          helpers.createSvgElement("path", {
            d: plotPath,
            class: "plot",
          })
        );
      }
    },
    formatLabelTeX: (tex) => tex,
    buildTransferTeX: (num, den) => `\\frac{${num.join("s+")}}{${den.join("s+")}}`,
    renderLabelNode: (block, label, { showNode = true } = {}) => {
      const group = block.group;
      if (!group.appendChild) {
        console.error("renderLabelNode: group.appendChild is not a function", group);
        return;
      }
      const tex = helpers.formatLabelTeX(label);
      const mathWidth = Math.max(block.width, tex.length * 8 + 12);
      const offsetX = (block.width - mathWidth) / 2;
      const mathGroup = helpers.createSvgElement("g", {
        class: "label-math",
        transform: `translate(${offsetX},-24)`,
      });
      group.appendChild(mathGroup);
      helpers.renderTeXMath(mathGroup, tex, mathWidth, block.height);
      if (showNode) {
        group.appendChild(helpers.createSvgElement("circle", { cx: 20, cy: 20, r: 5, class: "label-node" }));
      }
    },
  };
  
  window.blockTemplates = buildBlockTemplates(helpers);
  
  if (state.loadedSubsystems.size) {
    const subsystemBlocks = Array.from(state.loadedSubsystems.entries()).map(([key, spec]) => ({
      type: "subsystem",
      label: spec.name,
      subsystemKey: key,
    }));
    groups.push({
      id: "subsystems",
      title: "Subsystems",
      blocks: subsystemBlocks,
    });
  }
  groups.forEach((group) => {
    const details = document.createElement("details");
    details.className = "tool-group";
    const summary = document.createElement("summary");
    summary.textContent = group.title;
    details.appendChild(summary);
    group.blocks.forEach((item) => {
      const button = document.createElement("button");
      button.className = "tool";
      button.dataset.type = item.type;
      if (item.subsystemKey) button.dataset.subsystemKey = item.subsystemKey;
      button.setAttribute("draggable", "true");
      
      button.addEventListener("dragstart", (event) => {
        console.log('button dragstart triggered, type:', item.type);
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", JSON.stringify({
          type: item.type,
          subsystemKey: item.subsystemKey || ""
        }));
        
        const dragGhost = button.cloneNode(true);
        dragGhost.style.position = "absolute";
        dragGhost.style.top = "-9999px";
        dragGhost.style.left = "-9999px";
        dragGhost.style.opacity = "0.8";
        document.body.appendChild(dragGhost);
        event.dataTransfer.setDragImage(dragGhost, 16, 16);
        
        setTimeout(() => {
          if (dragGhost.parentNode) {
            document.body.removeChild(dragGhost);
          }
        }, 0);
      });
      
      const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      iconSvg.setAttribute("fill", "none");
      iconSvg.setAttribute("stroke", "currentColor");
      iconSvg.setAttribute("stroke-width", "1.5");
      iconSvg.setAttribute("stroke-linecap", "round");
      iconSvg.setAttribute("stroke-linejoin", "round");
      
      const template = window.blockTemplates[item.type];
      if (template && template.render) {
        const targetHeight = 32;
        const scale = targetHeight / template.height;
        const targetWidth = template.width * scale;
        iconSvg.setAttribute("width", String(targetWidth));
        iconSvg.setAttribute("height", String(targetHeight));
        iconSvg.setAttribute("viewBox", `0 0 ${template.width} ${template.height}`);
        
        const block = {
          group: iconSvg,
          width: template.width,
          height: template.height,
          params: template.defaultParams || {},
        };
        template.render(block);
      } else {
        let iconPath = "";
        switch (item.type) {
          case "constant":
            iconPath = "M4 8h16M12 4v16";
            break;
          case "step":
            iconPath = "M4 16h4v4h4v-4h4v4h4M4 16h16";
            break;
          case "ramp":
            iconPath = "M4 16l4-4 4 4 4-4M4 16h16";
            break;
          case "impulse":
            iconPath = "M4 16l4-8 4 8 4-8M4 16h16";
            break;
          case "sine":
            iconPath = "M4 12q4-4 8-4 8 4-4 4-8-8-8";
            break;
          case "chirp":
            iconPath = "M4 12q2-4 3-3 4-4t3 2 4 4q2-4 3-3 4-4t3 2 4 4q2-4 3-3 4-4t3 2 4 4";
            break;
          case "noise":
            iconPath = "M4 12h2l2-2 2 2 2-2M10 12h2l2-2 2 2 2-2M16 12h2l2-2 2 2 2-2";
            break;
          case "fileSource":
            iconPath = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M16 9H8";
            break;
          case "labelSource":
            iconPath = "M4 6h16M4 12h16M4 18h16";
            break;
          case "integrator":
            iconPath = "M4 12h4l-2-2v4l2-2h4l2 2v-4l-2 2h4";
            break;
          case "tf":
            iconPath = "M4 12h4l2-2 4 2 2-2 4 2 4-2M4 12h16";
            break;
          case "delay":
            iconPath = "M4 12h4l2-2 4 2 2-2 4 2 4-2M4 12h16";
            break;
          case "stateSpace":
            iconPath = "M4 8h4v8h4v-8h4v8h4M4 8h16";
            break;
          case "lpf":
            iconPath = "M4 12h4l2-2 4 2 2-2 4 2 4-2M4 12h16";
            break;
          case "hpf":
            iconPath = "M4 12h4l2-2 4 2 2-2 4 2 4-2M4 12h16";
            break;
          case "derivative":
            iconPath = "M4 12h4l2-2 4 2 2-2 4 2 4-2M4 12h16";
            break;
          case "pid":
            iconPath = "M4 12h4l2-2 4 2 2-2 4 2 4-2M4 12h16";
            break;
          case "gain":
            iconPath = "M4 12h4l-2-2v4l2-2h4l2 2v-4l-2 2h4";
            break;
          case "sum":
            iconPath = "M12 4l-4 4h3l-2 2h2l2 2h3l4-4M12 4l4 4h-3l2 2h-2l-2 2h-3l-4 4";
            break;
          case "subsystem":
            iconPath = "M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6zM21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4";
            break;
          default:
            iconPath = "M4 4h16M4 8h16M4 12h16M4 16h16M4 20h16";
        }
        
        const iconPathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        iconPathEl.setAttribute("d", iconPath);
        iconSvg.appendChild(iconPathEl);
      }
      
      const iconContainer = document.createElement("span");
      iconContainer.className = "tool-icon";
      iconContainer.appendChild(iconSvg);
      
      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      
      button.appendChild(iconContainer);
      button.appendChild(labelSpan);
      details.appendChild(button);
    });
    blockLibraryGroups.appendChild(details);
  });
  
  if (blockLibraryGroups) {
    blockLibraryGroups.addEventListener("click", (event) => {
      const button = event.target.closest(".tool");
      if (!button) return;
      const type = button.dataset.type;
      const subsystemKey = button.dataset.subsystemKey || "";
      const viewBox = getWorkspaceViewBox();
      const zoomScale = getWorkspaceZoomScale();
      const centerX = viewBox ? viewBox.x + viewBox.w / 2 : 400;
      const centerY = viewBox ? viewBox.y + viewBox.h / 2 : 300;
      const offset = spawnOffsetForIndex(state.spawnIndex++);
      try {
        const options = {};
        if (type === "subsystem" && subsystemKey) {
          const spec = state.loadedSubsystems.get(subsystemKey);
          if (!spec) throw new Error("Subsystem spec not found");
          options.params = {
            name: spec.name,
            externalInputs: deepClone(spec.externalInputs),
            externalOutputs: deepClone(spec.externalOutputs),
            subsystem: deepClone(spec),
          };
        }
        const block = rendererRef.current?.createBlock(type, centerX + offset.x, centerY + offset.y, options);
        if (block) {
          state.routingDirty = true;
          rendererRef.current?.updateConnections(true);
          signalDiagramChanged();
          if (statusEl) statusEl.textContent = `Added ${type}`;
        }
      } catch (error) {
        if (statusEl) statusEl.textContent = `Error adding ${type}`;
        console.error('Error adding block:', error);
      }
    });
  }
}

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const spawnOffsetForIndex = (index) => {
  const offsets = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 0, y: 40 },
    { x: -40, y: 0 },
    { x: 0, y: -40 },
    { x: 40, y: 40 },
    { x: -40, y: 40 },
    { x: 40, y: -40 },
    { x: -40, y: -40 },
  ];
  return offsets[index % offsets.length];
};

const signalDiagramChanged = () => {
  window.dispatchEvent(new CustomEvent("diagramChanged"));
};
