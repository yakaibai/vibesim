export function createSvgElement(tag, attrs = {}, text = "") {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  if (text) el.textContent = text;
  return el;
}

export function renderSvgMath(group, mathMl, width, height) {
  if (!group) return;
  group.innerHTML = "";
  const foreign = createSvgElement("foreignObject", {
    x: 0,
    y: 0,
    width,
    height,
    class: "upright",
  });
  const div = document.createElement("div");
  div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  div.className = "math-foreign";
  div.innerHTML = mathMl;
  foreign.appendChild(div);
  group.appendChild(foreign);
}

export function renderTeXMath(group, tex, width, height) {
  if (!group) return;
  group.innerHTML = "";
  const foreign = createSvgElement("foreignObject", {
    x: 0,
    y: 0,
    width,
    height,
    class: "upright",
  });
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
      scheduleUserFuncResize(group);
    } catch {
      span.textContent = tex;
    }
  } else {
    katexQueue.add(group);
    queueKatexRender();
  }
  div.appendChild(span);
  foreign.appendChild(div);
  group.appendChild(foreign);
}

let katexRetryScheduled = false;
export const katexQueue = new Set();

function notifyUserFuncResize(group) {
  const blockEl = group?.closest?.(".svg-block");
  const blockId = blockEl?.dataset?.blockId;
  if (!blockId || typeof window === "undefined") return;
  if (typeof window.vibesimResizeMathBlock === "function") {
    window.vibesimResizeMathBlock(blockId);
    return;
  }
  if (typeof window.vibesimResizeUserFunc === "function") {
    window.vibesimResizeUserFunc(blockId);
  }
}

export function scheduleUserFuncResize(group) {
  notifyUserFuncResize(group);
  requestAnimationFrame(() => notifyUserFuncResize(group));
  setTimeout(() => notifyUserFuncResize(group), 150);
  if (typeof document === "undefined" || !document.fonts?.ready) return;
  document.fonts.ready.then(() => {
    requestAnimationFrame(() => notifyUserFuncResize(group));
  });
}

export function queueKatexRender() {
  if (katexRetryScheduled) return;
  katexRetryScheduled = true;
  setTimeout(() => {
    katexRetryScheduled = false;
    if (window.katex && typeof window.katex.render === "function") {
      const targets = Array.from(katexQueue);
      katexQueue.clear();
      targets.forEach((group) => {
        const spans = group.querySelectorAll(".katex-target[data-tex]");
        spans.forEach((span) => {
          const tex = span.dataset.tex || "";
          try {
            window.katex.render(tex, span, { throwOnError: false });
          } catch {
            span.textContent = tex;
          }
          span.classList.remove("katex-target");
        });
        scheduleUserFuncResize(group);
      });
    } else if (katexQueue.size) {
      queueKatexRender();
    }
  }, 100);
}

let userFuncMeasureRoot = null;

export function ensureUserFuncMeasureRoot() {
  if (userFuncMeasureRoot || typeof document === "undefined") return userFuncMeasureRoot;
  const wrapper = document.createElement("div");
  wrapper.style.position = "absolute";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "-100000px";
  wrapper.style.visibility = "hidden";
  wrapper.style.pointerEvents = "none";
  const minmax = document.createElement("div");
  minmax.className = "minmax-math";
  const foreign = document.createElement("div");
  foreign.className = "math-foreign";
  foreign.style.whiteSpace = "nowrap";
  minmax.appendChild(foreign);
  wrapper.appendChild(minmax);
  document.body.appendChild(wrapper);
  userFuncMeasureRoot = { wrapper, foreign };
  return userFuncMeasureRoot;
}

export function measureUserFuncTex(tex) {
  if (!tex || typeof document === "undefined") return null;
  if (!window.katex || typeof window.katex.render !== "function") return null;
  const root = ensureUserFuncMeasureRoot();
  if (!root) return null;
  root.foreign.innerHTML = "";
  const span = document.createElement("span");
  span.style.whiteSpace = "nowrap";
  root.foreign.appendChild(span);
  try {
    window.katex.render(tex, span, { throwOnError: false });
  } catch {
    span.textContent = tex;
  }
  const target = root.foreign.querySelector(".katex") || span;
  const rect = target.getBoundingClientRect();
  const width = Math.max(rect.width, target.scrollWidth || 0);
  const height = Math.max(rect.height, target.scrollHeight || 0);
  if (!width || !height) return null;
  return { w: width, h: height };
}
