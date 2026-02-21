export function sanitizeFilename(name) {
  const base = String(name || "vibesim").trim() || "vibesim";
  return base.replace(/[^a-zA-Z0-9_-]+/g, "_");
}

export function sanitizeParamsForSave(params) {
  if (!params || typeof params !== "object") return params || {};
  const cleaned = { ...params };
  if (cleaned._visible && typeof cleaned._visible === "object") {
    const visible = {};
    Object.entries(cleaned._visible).forEach(([key, value]) => {
      if (key === "{}") return;
      if (!value) return;
      visible[key] = true;
    });
    if (Object.keys(visible).length > 0) cleaned._visible = visible;
    else delete cleaned._visible;
  }
  return cleaned;
}

function yamlScalar(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  const str = String(value);
  if (/^[A-Za-z0-9_.-]+$/.test(str)) return str;
  return JSON.stringify(str);
}

export function toYAML(data) {
  const lines = [];
  const isScalarArray = (value) =>
    Array.isArray(value)
    && value.length > 0
    && value.every((item) => {
      if (item === null || item === undefined) return true;
      const t = typeof item;
      return t === "number" || t === "string" || t === "boolean";
    });
  const isPointPairArray = (value) =>
    Array.isArray(value)
    && value.length > 0
    && value.every((item) =>
      Array.isArray(item)
      && item.length >= 2
      && Number.isFinite(Number(item[0]))
      && Number.isFinite(Number(item[1])));
  const write = (value, indent) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${" ".repeat(indent)}[]`);
        return;
      }
      if (isScalarArray(value)) {
        lines.push(`${" ".repeat(indent)}${JSON.stringify(value)}`);
        return;
      }
      if (isPointPairArray(value)) {
        lines.push(`${" ".repeat(indent)}${JSON.stringify(value)}`);
        return;
      }
      value.forEach((item) => {
        if (typeof item === "object" && item !== null) {
          lines.push(`${" ".repeat(indent)}-`);
          write(item, indent + 2);
        } else {
          lines.push(`${" ".repeat(indent)}- ${yamlScalar(item)}`);
        }
      });
      return;
    }
    if (typeof value === "object" && value !== null) {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        lines.push(`${" ".repeat(indent)}{}`);
        return;
      }
      entries.forEach(([key, val]) => {
        if (Array.isArray(val) && val.length === 0) {
          lines.push(`${" ".repeat(indent)}${key}: []`);
          return;
        }
        if (isScalarArray(val)) {
          lines.push(`${" ".repeat(indent)}${key}: ${JSON.stringify(val)}`);
          return;
        }
        if (isPointPairArray(val)) {
          lines.push(`${" ".repeat(indent)}${key}: ${JSON.stringify(val)}`);
          return;
        }
        if (val === null) {
          lines.push(`${" ".repeat(indent)}${key}:`);
          return;
        }
        if (typeof val === "object") {
          lines.push(`${" ".repeat(indent)}${key}:`);
          write(val, indent + 2);
        } else {
          lines.push(`${" ".repeat(indent)}${key}: ${yamlScalar(val)}`);
        }
      });
      return;
    }
    lines.push(`${" ".repeat(indent)}${yamlScalar(value)}`);
  };
  write(data, 0);
  return lines.join("\n");
}

export function serializeDiagram(state) {
  const blocks = Array.from(state.blocks.values()).map((block) => ({
    id: block.id,
    type: block.type,
    x: Math.round(block.x),
    y: Math.round(block.y),
    rotation: block.rotation || 0,
    params: sanitizeParamsForSave(block.params || {}),
  }));
  const connections = state.connections.map((conn) => {
    const base = {
      from: conn.from,
      to: conn.to,
      fromIndex: conn.fromIndex ?? 0,
      toIndex: conn.toIndex ?? 0,
    };
    if (!Array.isArray(conn.points) || conn.points.length < 2) return base;
    const points = conn.points
      .map((pt) => [Number(pt?.x), Number(pt?.y)])
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    if (points.length < 2) return base;
    return { ...base, points };
  });
  return {
    version: 1,
    name: state.diagramName || "vibesim",
    blocks,
    connections,
    variables: state.variablesText || "",
    runtime: runtimeInput?.value || "10",
    sampleTime: state.sampleTime || 0.01,
    autoRoute: state.autoRoute,
  };
}

function parseScalar(raw) {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "[]") return [];
  if (raw === "{}") return {};
  if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("{") && raw.endsWith("}"))) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through and treat as plain text if this is not valid JSON
    }
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

export function parseYAML(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "  "))
    .filter((line) => line.trim().length > 0 && !line.trim().startsWith("#"))
    .map((line) => ({
      indent: line.match(/^ */)[0].length,
      text: line.trim(),
    }));
  let index = 0;

  const isArrayLine = (line) => line && (line.text === "-" || line.text.startsWith("- "));
  const peek = () => lines[index] || null;
  const splitKeyValue = (textLine) => {
    let splitAt = -1;
    for (let i = 0; i < textLine.length; i += 1) {
      if (textLine[i] !== ":") continue;
      const next = textLine[i + 1];
      if (next === undefined || /\s/.test(next)) {
        splitAt = i;
        break;
      }
    }
    if (splitAt < 0) splitAt = textLine.indexOf(":");
    if (splitAt < 0) return { key: "", valueRaw: "" };
    return {
      key: textLine.slice(0, splitAt).trim(),
      valueRaw: textLine.slice(splitAt + 1).trim(),
    };
  };

  const parseNode = (indentLevel) => {
    const line = peek();
    if (!line || line.indent < indentLevel) return null;
    if (isArrayLine(line)) return parseArray(indentLevel);
    return parseObject(indentLevel);
  };

  const parseObjectEntryInto = (obj, indentLevel) => {
    const line = peek();
    if (!line || line.indent !== indentLevel || isArrayLine(line) || !line.text.includes(":")) {
      return false;
    }
    const { key, valueRaw } = splitKeyValue(line.text);
    index += 1;
    if (!key || key === "{}") return true;
    if (valueRaw) {
      obj[key] = parseScalar(valueRaw);
      return true;
    }
    const next = peek();
    if (!next || next.indent <= indentLevel) {
      obj[key] = null;
      return true;
    }
    obj[key] = parseNode(next.indent);
    return true;
  };

  const parseInlineArrayObject = (text, childIndent) => {
    const obj = {};
    const { key, valueRaw } = splitKeyValue(text);
    if (key && key !== "{}") {
      if (valueRaw) {
        obj[key] = parseScalar(valueRaw);
      } else {
        const next = peek();
        if (!next || next.indent <= childIndent - 2) obj[key] = null;
        else obj[key] = parseNode(next.indent);
      }
    }
    return obj;
  };

  const parseInlineArray = (text, childIndent) => {
    if (!text.includes(":")) return parseScalar(text);
    const { key, valueRaw } = splitKeyValue(text);
    if (key === "{}") return parseScalar(valueRaw);
    if (!valueRaw) return { [key]: null };
    const next = peek();
    if (!next || next.indent <= childIndent - 2) return { [key]: null };
    if (isArrayLine(next)) return { [key]: parseArray(next.indent) };
    return { [key]: parseNode(next.indent) };
  };

  const parseArray = (indentLevel) => {
    const arr = [];
    const childIndent = indentLevel + 2;
    while (index < lines.length) {
      const line = lines[index];
      if (!line || line.indent < indentLevel) break;
      if (line.indent !== childIndent) {
        if (line.text.startsWith("- ")) {
          const itemText = line.text.slice(2);
          if (itemText.includes(":")) {
            const next = lines[index + 1];
            const nextIndent = next?.indent || 0;
            if (next && nextIndent === childIndent) {
              arr.push(parseInlineArrayObject(itemText, childIndent));
            } else {
              arr.push(parseInlineArray(itemText, childIndent));
            }
          } else {
            arr.push(parseScalar(itemText));
          }
        }
        index += 1;
        continue;
      }
      const item = parseNode(childIndent);
      if (item === null) break;
      arr.push(item);
    }
    return arr;
  };

  const parseObject = (indentLevel) => {
    const obj = {};
    const childIndent = indentLevel + 2;
    while (index < lines.length) {
      if (!parseObjectEntryInto(obj, indentLevel)) break;
    }
    return obj;
  };

  const root = parseNode(0);
  if (!root || typeof root !== "object") throw new Error("Invalid YAML format");
  return root;
}
