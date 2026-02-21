const connectionKey = (conn) =>
  `${conn.from}:${Number(conn.fromIndex ?? 0)}->${conn.to}:${Number(conn.toIndex ?? 0)}`;

export function buildConnectionSignature(connections) {
  if (!Array.isArray(connections)) return "";
  return connections.map((conn) => connectionKey(conn)).join("|");
}

export function canApplyWorkerRoutes({
  jobEpoch,
  currentEpoch,
  jobSignature,
  currentSignature,
  routes,
  connectionCount,
}) {
  if (!Array.isArray(routes)) return false;
  if (!Number.isFinite(connectionCount) || connectionCount < 0) return false;
  if (routes.length !== connectionCount) return false;
  if (Number.isFinite(jobEpoch) && Number.isFinite(currentEpoch) && jobEpoch !== currentEpoch) {
    return false;
  }
  if (typeof jobSignature === "string" && typeof currentSignature === "string" && jobSignature !== currentSignature) {
    return false;
  }
  return true;
}

