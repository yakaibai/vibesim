const toNum = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

function stableSortExternalPorts(items) {
  return items.slice().sort((a, b) => {
    const dy = toNum(a.y) - toNum(b.y);
    if (dy !== 0) return dy;
    const dx = toNum(a.x) - toNum(b.x);
    if (dx !== 0) return dx;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export function collectExternalPorts(blocks, type) {
  if (!Array.isArray(blocks)) return [];
  const filtered = blocks
    .filter((b) => b?.type === type && b?.params?.isExternalPort === true)
    .map((b) => ({
      id: b.id,
      name: String(b?.params?.name || b.id),
      x: toNum(b?.x),
      y: toNum(b?.y),
    }));
  const sorted = stableSortExternalPorts(filtered);
  return sorted.map(({ id, name }) => ({ id, name }));
}

export function stabilizeExternalPortOrder(nextPorts, previousPorts) {
  const next = Array.isArray(nextPorts) ? nextPorts.map((p) => ({ id: p?.id, name: String(p?.name || p?.id || "") })) : [];
  const previous = Array.isArray(previousPorts) ? previousPorts : [];
  if (!next.length || !previous.length) return next;
  const nextMap = new Map(next.map((p) => [String(p.id), p]));
  const sameSet = next.length === previous.length && previous.every((p) => nextMap.has(String(p?.id)));
  if (!sameSet) return next;
  const ordered = [];
  previous.forEach((p) => {
    const match = nextMap.get(String(p?.id));
    if (match) ordered.push(match);
  });
  return ordered.length === next.length ? ordered : next;
}

export function externalPortsChanged(previousPorts, nextPorts) {
  const prev = Array.isArray(previousPorts) ? previousPorts : [];
  const next = Array.isArray(nextPorts) ? nextPorts : [];
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i] || {};
    const b = next[i] || {};
    if (String(a.id || "") !== String(b.id || "")) return true;
    if (String(a.name || "") !== String(b.name || "")) return true;
  }
  return false;
}

