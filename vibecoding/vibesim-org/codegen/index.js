import { generateC } from "./c.js";
import { generatePython } from "./python.js";
import { generateTikz } from "./tikz.js";

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const connKey = (conn) =>
  `${conn.from}:${Number(conn.fromIndex ?? 0)}->${conn.to}:${Number(conn.toIndex ?? 0)}`;

const normalizeConnection = (conn) => ({
  from: conn.from,
  to: conn.to,
  fromIndex: Number(conn.fromIndex ?? 0),
  toIndex: Number(conn.toIndex ?? 0),
});

const flattenOneSubsystem = (diagram, subsystemBlock) => {
  const spec = subsystemBlock?.params?.subsystem;
  if (!spec || !Array.isArray(spec.blocks) || !Array.isArray(spec.connections)) return diagram;
  const subId = subsystemBlock.id;
  const prefix = `${subId}__`;

  const remapId = (id) => `${prefix}${id}`;
  const innerBlocks = spec.blocks.map((block) => {
    const copy = deepClone(block);
    copy.id = remapId(block.id);
    return copy;
  });
  const innerConnections = spec.connections.map((conn) => ({
    from: remapId(conn.from),
    to: remapId(conn.to),
    fromIndex: Number(conn.fromIndex ?? 0),
    toIndex: Number(conn.toIndex ?? 0),
  }));

  const extInputIds = (spec.externalInputs || []).map((entry) => remapId(entry.id));
  const extOutputIds = (spec.externalOutputs || []).map((entry) => remapId(entry.id));
  const extInputSet = new Set(extInputIds);
  const extOutputSet = new Set(extOutputIds);

  const outerConnections = (diagram.connections || []).map(normalizeConnection);
  const preservedOuter = outerConnections.filter((conn) => conn.from !== subId && conn.to !== subId);
  const inboundOuter = outerConnections.filter((conn) => conn.to === subId);
  const outboundOuter = outerConnections.filter((conn) => conn.from === subId);

  const extInputFanouts = new Map();
  extInputIds.forEach((id, idx) => {
    extInputFanouts.set(idx, innerConnections.filter((conn) => conn.from === id));
  });
  const extOutputFeeds = new Map();
  extOutputIds.forEach((id, idx) => {
    extOutputFeeds.set(idx, innerConnections.filter((conn) => conn.to === id));
  });

  const preservedInner = innerConnections.filter(
    (conn) => !extInputSet.has(conn.from) && !extInputSet.has(conn.to) && !extOutputSet.has(conn.from) && !extOutputSet.has(conn.to)
  );

  const mergedConnections = [...preservedOuter, ...preservedInner];
  inboundOuter.forEach((conn) => {
    const fanouts = extInputFanouts.get(Number(conn.toIndex ?? 0)) || [];
    fanouts.forEach((fanout) => {
      mergedConnections.push({
        from: conn.from,
        to: fanout.to,
        fromIndex: Number(conn.fromIndex ?? 0),
        toIndex: Number(fanout.toIndex ?? 0),
      });
    });
  });
  outboundOuter.forEach((conn) => {
    const feeds = extOutputFeeds.get(Number(conn.fromIndex ?? 0)) || [];
    feeds.forEach((feed) => {
      mergedConnections.push({
        from: feed.from,
        to: conn.to,
        fromIndex: Number(feed.fromIndex ?? 0),
        toIndex: Number(conn.toIndex ?? 0),
      });
    });
  });

  const dedupedConnections = [];
  const seen = new Set();
  mergedConnections.forEach((conn) => {
    const key = connKey(conn);
    if (seen.has(key)) return;
    seen.add(key);
    dedupedConnections.push(conn);
  });

  const blocks = [
    ...(diagram.blocks || []).filter((block) => block.id !== subId),
    ...innerBlocks.filter((block) => !extInputSet.has(block.id) && !extOutputSet.has(block.id)),
  ];

  return {
    ...diagram,
    blocks,
    connections: dedupedConnections,
  };
};

const flattenSubsystemsForCodegen = (diagram) => {
  let current = {
    ...diagram,
    blocks: deepClone(diagram.blocks || []),
    connections: deepClone(diagram.connections || []),
  };
  for (let guard = 0; guard < 1000; guard += 1) {
    const nextSubsystem = (current.blocks || []).find(
      (block) =>
        block?.type === "subsystem" &&
        block?.params?.subsystem &&
        Array.isArray(block.params.subsystem.blocks) &&
        Array.isArray(block.params.subsystem.connections)
    );
    if (!nextSubsystem) return current;
    current = flattenOneSubsystem(current, nextSubsystem);
  }
  return current;
};

export const generateCode = ({ lang = "c", sampleTime = 0.01, includeMain = true, diagram }) => {
  const sourceDiagram = diagram || {};
  const flattened = flattenSubsystemsForCodegen(sourceDiagram);
  if (lang === "c") {
    return generateC(flattened, { sampleTime, includeMain });
  }
  if (lang === "python") {
    return generatePython(flattened, { sampleTime, includeMain });
  }
  if (lang === "tikz") {
    return generateTikz(sourceDiagram);
  }
  throw new Error(`Unsupported language: ${lang}`);
};
