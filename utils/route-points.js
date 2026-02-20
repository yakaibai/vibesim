export function clonePoints(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const out = points
    .map((pt) => {
      if (Array.isArray(pt) && pt.length >= 2) {
        return { x: Number(pt[0]), y: Number(pt[1]) };
      }
      return { x: Number(pt?.x), y: Number(pt?.y) };
    })
    .filter((pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y));
  return out.length >= 2 ? out : null;
}

export function captureRoutePointsSnapshot(connections, keyFn) {
  const byIndex = Array.isArray(connections)
    ? connections.map((conn) => clonePoints(conn?.points))
    : [];
  const byKey = {};
  if (Array.isArray(connections)) {
    connections.forEach((conn) => {
      const points = clonePoints(conn?.points);
      if (!points) return;
      const key = keyFn(conn);
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(points);
    });
  }
  return { byIndex, byKey };
}

export function applyRoutePointsSnapshot(connections, snapshot, keyFn) {
  if (!Array.isArray(connections) || !snapshot || typeof snapshot !== 'object') return 0;
  let applied = 0;
  const byIndex = Array.isArray(snapshot.byIndex) ? snapshot.byIndex : null;
  const canUseIndex = byIndex && byIndex.length === connections.length;
  if (canUseIndex) {
    connections.forEach((conn, idx) => {
      const points = clonePoints(byIndex[idx]);
      if (!points) return;
      conn.points = points;
      applied += 1;
    });
    return applied;
  }
  const byKeyRaw = snapshot.byKey && typeof snapshot.byKey === 'object' ? snapshot.byKey : null;
  if (!byKeyRaw) return 0;
  const queues = new Map();
  Object.entries(byKeyRaw).forEach(([key, queue]) => {
    if (!Array.isArray(queue)) return;
    const parsed = queue.map((entry) => clonePoints(entry)).filter(Boolean);
    if (parsed.length) queues.set(key, parsed);
  });
  connections.forEach((conn) => {
    const key = keyFn(conn);
    const queue = queues.get(key);
    if (!queue || !queue.length) return;
    const points = queue.shift();
    if (!points) return;
    conn.points = points;
    applied += 1;
    if (!queue.length) queues.delete(key);
  });
  return applied;
}
