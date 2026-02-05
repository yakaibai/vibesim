export const replaceLatexVars = (expr) =>
  String(expr || "").replace(/\\[A-Za-z]+/g, (match) => match.slice(1));

const mathAliases = {
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  atan2: Math.atan2,
  ceil: Math.ceil,
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  cos: Math.cos,
  cosh: Math.cosh,
  exp: Math.exp,
  floor: Math.floor,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sinc: (value) => {
    if (value === 0) return 1;
    const x = Math.PI * value;
    return Math.sin(x) / x;
  },
  sinh: Math.sinh,
  sqrt: Math.sqrt,
  tan: Math.tan,
  tanh: Math.tanh,
  pi: Math.PI,
  e: Math.E,
  inf: Infinity,
  infinity: Infinity
};

const tokenize = (expr) => {
  const tokens = [];
  const input = String(expr);
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let start = i;
      i += 1;
      while (i < input.length && /[0-9.]/.test(input[i])) i += 1;
      if (i < input.length && /[eE]/.test(input[i])) {
        i += 1;
        if (/[+-]/.test(input[i])) i += 1;
        while (i < input.length && /[0-9]/.test(input[i])) i += 1;
      }
      tokens.push({ type: "number", value: Number(input.slice(start, i)) });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let start = i;
      i += 1;
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) i += 1;
      const name = input.slice(start, i);
      tokens.push({ type: "ident", value: name });
      continue;
    }
    if ("+-*/^(),".includes(ch)) {
      if (ch === "(") tokens.push({ type: "lparen" });
      else if (ch === ")") tokens.push({ type: "rparen" });
      else if (ch === ",") tokens.push({ type: "comma" });
      else tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    return [];
  }
  return tokens;
};

const opInfo = {
  "^": { prec: 4, assoc: "right", arity: 2 },
  neg: { prec: 3, assoc: "right", arity: 1 },
  "*": { prec: 2, assoc: "left", arity: 2 },
  "/": { prec: 2, assoc: "left", arity: 2 },
  "+": { prec: 1, assoc: "left", arity: 2 },
  "-": { prec: 1, assoc: "left", arity: 2 }
};

const toRpn = (tokens) => {
  const output = [];
  const opStack = [];
  const parenStack = [];
  let prevType = "start";
  const tokenCount = tokens.length;
  for (let idx = 0; idx < tokenCount; idx += 1) {
    const token = tokens[idx];
    if (token.type === "number") {
      output.push(token);
      if (
        parenStack.length &&
        parenStack[parenStack.length - 1].isFunc &&
        (prevType === "lparen" || prevType === "comma")
      ) {
        parenStack[parenStack.length - 1].argc += 1;
      }
      prevType = "value";
      continue;
    }
    if (token.type === "ident") {
      const next = tokens[idx + 1];
      if (next && next.type === "lparen") {
        if (
          parenStack.length &&
          parenStack[parenStack.length - 1].isFunc &&
          (prevType === "lparen" || prevType === "comma")
        ) {
          parenStack[parenStack.length - 1].argc += 1;
        }
        opStack.push({ type: "func", name: token.value.toLowerCase() });
        prevType = "func";
      } else {
        output.push({ type: "ident", value: token.value });
        if (
          parenStack.length &&
          parenStack[parenStack.length - 1].isFunc &&
          (prevType === "lparen" || prevType === "comma")
        ) {
          parenStack[parenStack.length - 1].argc += 1;
        }
        prevType = "value";
      }
      continue;
    }
    if (token.type === "op") {
      let op = token.value;
      if (
        op === "-" &&
        (prevType === "start" ||
          prevType === "op" ||
          prevType === "lparen" ||
          prevType === "comma")
      ) {
        op = "neg";
        if (
          parenStack.length &&
          parenStack[parenStack.length - 1].isFunc &&
          (prevType === "lparen" || prevType === "comma")
        ) {
          parenStack[parenStack.length - 1].argc += 1;
        }
      }
      const info = opInfo[op];
      if (!info) return [];
      while (opStack.length) {
        const top = opStack[opStack.length - 1];
        if (!top || top.type !== "op") break;
        const topInfo = opInfo[top.value];
        if (
          (info.assoc === "left" && info.prec <= topInfo.prec) ||
          (info.assoc === "right" && info.prec < topInfo.prec)
        ) {
          output.push(opStack.pop());
          continue;
        }
        break;
      }
      opStack.push({ type: "op", value: op });
      prevType = "op";
      continue;
    }
    if (token.type === "lparen") {
      if (
        parenStack.length &&
        parenStack[parenStack.length - 1].isFunc &&
        (prevType === "lparen" || prevType === "comma")
      ) {
        parenStack[parenStack.length - 1].argc += 1;
      }
      opStack.push(token);
      const isFunc =
        opStack.length > 1 && opStack[opStack.length - 2].type === "func";
      parenStack.push({ isFunc, argc: 0 });
      prevType = "lparen";
      continue;
    }
    if (token.type === "comma") {
      while (opStack.length && opStack[opStack.length - 1].type !== "lparen") {
        output.push(opStack.pop());
      }
      if (!opStack.length) return [];
      prevType = "comma";
      continue;
    }
    if (token.type === "rparen") {
      while (opStack.length && opStack[opStack.length - 1].type !== "lparen") {
        output.push(opStack.pop());
      }
      if (!opStack.length) return [];
      opStack.pop();
      const paren = parenStack.pop();
      if (paren && paren.isFunc) {
        const funcToken = opStack.pop();
        if (!funcToken || funcToken.type !== "func") return [];
        if (paren.argc <= 0) return [];
        output.push({ type: "func", name: funcToken.name, argc: paren.argc });
      }
      prevType = "value";
      continue;
    }
  }
  while (opStack.length) {
    const top = opStack.pop();
    if (top.type === "lparen") return [];
    output.push(top);
  }
  return output;
};

const evalRpn = (rpn, scope) => {
  const stack = [];
  for (const token of rpn) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }
    if (token.type === "ident") {
      if (!Object.prototype.hasOwnProperty.call(scope, token.value)) return NaN;
      const value = scope[token.value];
      if (typeof value === "function") return NaN;
      stack.push(Number(value));
      continue;
    }
    if (token.type === "op") {
      const info = opInfo[token.value];
      if (stack.length < info.arity) return NaN;
      if (info.arity === 1) {
        const a = stack.pop();
        stack.push(-a);
      } else {
        const b = stack.pop();
        const a = stack.pop();
        switch (token.value) {
          case "+":
            stack.push(a + b);
            break;
          case "-":
            stack.push(a - b);
            break;
          case "*":
            stack.push(a * b);
            break;
          case "/":
            stack.push(a / b);
            break;
          case "^":
            stack.push(Math.pow(a, b));
            break;
          default:
            return NaN;
        }
      }
      continue;
    }
    if (token.type === "func") {
      if (!Object.prototype.hasOwnProperty.call(scope, token.name)) return NaN;
      const fn = scope[token.name];
      if (typeof fn !== "function") return NaN;
      if (stack.length < token.argc) return NaN;
      const args = stack.splice(stack.length - token.argc, token.argc);
      const out = fn(...args);
      stack.push(out);
    }
  }
  if (stack.length !== 1) return NaN;
  const result = stack[0];
  return Number.isNaN(result) ? NaN : result;
};

export const evalExpression = (expr, variables) => {
  if (typeof expr === "number") return expr;
  if (expr == null) return NaN;
  const trimmed = replaceLatexVars(expr).trim();
  if (!trimmed) return NaN;
  const direct = Number(trimmed);
  if (!Number.isNaN(direct)) return direct;
  const scope = { ...mathAliases, ...(variables || {}) };
  const tokens = tokenize(trimmed);
  if (!tokens.length) return NaN;
  const rpn = toRpn(tokens);
  if (!rpn.length) return NaN;
  return evalRpn(rpn, scope);
};

const buildAst = (rpn) => {
  const stack = [];
  for (const token of rpn) {
    if (token.type === "number") {
      stack.push({ type: "number", value: token.value });
      continue;
    }
    if (token.type === "ident") {
      stack.push({ type: "ident", name: token.value });
      continue;
    }
    if (token.type === "op") {
      const info = opInfo[token.value];
      if (!info || stack.length < info.arity) return null;
      if (info.arity === 1) {
        const arg = stack.pop();
        stack.push({ type: "op", op: token.value, arg });
      } else {
        const right = stack.pop();
        const left = stack.pop();
        stack.push({ type: "op", op: token.value, left, right });
      }
      continue;
    }
    if (token.type === "func") {
      if (stack.length < token.argc) return null;
      const args = stack.splice(stack.length - token.argc, token.argc);
      stack.push({ type: "func", name: token.name, args });
    }
  }
  if (stack.length !== 1) return null;
  return stack[0];
};

const latexFunctions = {
  sin: "\\sin",
  cos: "\\cos",
  tan: "\\tan",
  asin: "\\arcsin",
  acos: "\\arccos",
  atan: "\\arctan",
  sinh: "\\sinh",
  cosh: "\\cosh",
  tanh: "\\tanh",
  exp: "\\exp",
  log: "\\log"
};

const escapeLatexText = (text) => String(text).replace(/_/g, "\\_");

const nodePrecedence = (node) => {
  if (!node) return 0;
  if (node.type === "number" || node.type === "ident") return 5;
  if (node.type === "func") return 4;
  if (node.type === "op") {
    if (node.op === "neg") return 3;
    if (node.op === "^") return 3;
    if (node.op === "*" || node.op === "/") return 2;
    return 1;
  }
  return 0;
};

const wrapParen = (content, shouldWrap) => {
  if (!shouldWrap) return content;
  const needsLarge = /\\left\(|\\right\)|\(/.test(content);
  return needsLarge ? `\\left(${content}\\right)` : `(${content})`;
};

const renderLatex = (node, parentPrec = 0, parentOp = null) => {
  if (!node) return "";
  if (node.type === "number") {
    return Number.isFinite(node.value) ? String(node.value) : "0";
  }
  if (node.type === "ident") {
    if (node.name === "pi") return "\\pi";
    if (node.name === "e") return "e";
    if (/^[A-Za-z]$/.test(node.name)) return node.name;
    return `\\mathrm{${escapeLatexText(node.name)}}`;
  }
  if (node.type === "func") {
    const name = node.name;
    const args = node.args.map((arg) => renderLatex(arg, 0));
    if (name === "sqrt" && args[0]) {
      return `\\sqrt{${args[0]}}`;
    }
    if (name === "abs" && args[0]) {
      return `\\left|${args[0]}\\right|`;
    }
    if (name === "min") {
      return `\\min${wrapParen(args.join(", "), true)}`;
    }
    if (name === "max") {
      return `\\max${wrapParen(args.join(", "), true)}`;
    }
    if (name === "sinc") {
      return `\\operatorname{sinc}${wrapParen(args.join(", "), true)}`;
    }
    if (name === "clamp") {
      return `\\operatorname{clamp}${wrapParen(args.join(", "), true)}`;
    }
    if (name === "log10") {
      return `\\log_{10}${wrapParen(args.join(", "), true)}`;
    }
    if (name === "log2") {
      return `\\log_{2}${wrapParen(args.join(", "), true)}`;
    }
    if (name === "pow" && args.length === 2) {
      return `${args[0]}^{${args[1]}}`;
    }
    const fn = latexFunctions[name] || `\\operatorname{${escapeLatexText(name)}}`;
    return `${fn}${wrapParen(args.join(", "), true)}`;
  }
  if (node.type === "op") {
    const prec = nodePrecedence(node);
    if (node.op === "neg") {
      const inner = renderLatex(node.arg, prec, "neg");
      return wrapParen(`-${inner}`, prec < parentPrec);
    }
    const left = renderLatex(node.left, prec, node.op);
    const right = renderLatex(node.right, prec, node.op);
    let expr = "";
    if (node.op === "+") expr = `${left} + ${right}`;
    else if (node.op === "-") expr = `${left} - ${right}`;
    else if (node.op === "*") expr = `${left} ${right}`;
    else if (node.op === "/") expr = `\\frac{${left}}{${right}}`;
    else if (node.op === "^") expr = `${left}^{${right}}`;
    const needsWrap =
      prec < parentPrec ||
      (parentOp === "^" && node.op === "^");
    return wrapParen(expr, needsWrap);
  }
  return "";
};

export const exprToLatex = (expr) => {
  if (expr == null) return "";
  const trimmed = replaceLatexVars(expr).trim();
  if (!trimmed) return "";
  const tokens = tokenize(trimmed);
  if (!tokens.length) return escapeLatexText(trimmed);
  const rpn = toRpn(tokens);
  if (!rpn.length) return escapeLatexText(trimmed);
  const ast = buildAst(rpn);
  if (!ast) return escapeLatexText(trimmed);
  return renderLatex(ast);
};

const stripLatexCommands = (latex) =>
  String(latex || "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\operatorname\{([^}]*)\}/g, "$1")
    .replace(/\\([a-zA-Z]+)/g, "$1")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const estimateLatexWidth = (latex) => {
  const visible = stripLatexCommands(latex);
  const length = Math.max(visible.length, 1);
  const charWidth = 16;
  const padding = 40;
  const minWidth = 120;
  return Math.max(minWidth, Math.ceil(length * charWidth + padding));
};

export const resolveNumeric = (value, variables, { allowExpressions = true } = {}) => {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value).trim();
  if (!text) return 0;
  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;
  const merged = { pi: Math.PI, e: Math.E, ...(variables || {}) };
  if (Object.prototype.hasOwnProperty.call(merged, text)) {
    return Number(merged[text]) || 0;
  }
  const stripped = text.startsWith("\\") ? text.slice(1) : text;
  if (Object.prototype.hasOwnProperty.call(merged, stripped)) {
    return Number(merged[stripped]) || 0;
  }
  if (!allowExpressions) return 0;
  const evaluated = evalExpression(text, merged);
  return Number.isFinite(evaluated) ? evaluated : 0;
};

export const resolveArray = (value, variables, options) => {
  if (Array.isArray(value)) {
    return value.map((v) => resolveNumeric(v, variables, options));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => resolveNumeric(v, variables, options));
  }
  return [];
};
