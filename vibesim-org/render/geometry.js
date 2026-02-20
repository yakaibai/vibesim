export const rotatePoint = (point, block) => {
  const angle = ((block.rotation || 0) % 360 + 360) % 360;
  if (angle === 0) return point;
  const cx = block.x + block.width / 2;
  const cy = block.y + block.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  if (angle === 90) return { x: cx - dy, y: cy + dx };
  if (angle === 180) return { x: cx - dx, y: cy - dy };
  if (angle === 270) return { x: cx + dy, y: cy - dx };
  return point;
};

export const getRotatedBounds = (block) => {
  const angle = ((block.rotation || 0) % 360 + 360) % 360;
  const cx = block.x + block.width / 2;
  const cy = block.y + block.height / 2;
  const swap = angle === 90 || angle === 270;
  const w = swap ? block.height : block.width;
  const h = swap ? block.width : block.height;
  return {
    left: cx - w / 2,
    right: cx + w / 2,
    top: cy - h / 2,
    bottom: cy + h / 2,
  };
};

export const getPortSide = (block, rotatedPoint) => {
  const center = { x: block.x + block.width / 2, y: block.y + block.height / 2 };
  const dx = rotatedPoint.x - center.x;
  const dy = rotatedPoint.y - center.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "top" : "bottom";
};

export const blockBounds = (block) => {
  const PORT_RADIUS = 6;
  const bounds = getRotatedBounds(block);
  let left = bounds.left;
  let right = bounds.right;
  let top = bounds.top;
  let bottom = bounds.bottom;
  block.ports.forEach((port) => {
    const pos = rotatePoint({ x: block.x + port.x, y: block.y + port.y }, block);
    const cx = pos.x;
    const cy = pos.y;
    left = Math.min(left, cx - PORT_RADIUS);
    right = Math.max(right, cx + PORT_RADIUS);
    top = Math.min(top, cy - PORT_RADIUS);
    bottom = Math.max(bottom, cy + PORT_RADIUS);
  });
  const padding = 0;
  return {
    left: left - padding,
    right: right + padding,
    top: top - padding,
    bottom: bottom + padding,
  };
};

export const segmentHitsRect = (a, b, rect) => {
  if (a.x === b.x) {
    const x = a.x;
    const y1 = Math.min(a.y, b.y);
    const y2 = Math.max(a.y, b.y);
    return x >= rect.left && x <= rect.right && y2 >= rect.top && y1 <= rect.bottom;
  }
  if (a.y === b.y) {
    const y = a.y;
    const x1 = Math.min(a.x, b.x);
    const x2 = Math.max(a.x, b.x);
    return y >= rect.top && y <= rect.bottom && x2 >= rect.left && x1 <= rect.right;
  }
  return false;
};

export const segmentsIntersect = (segA, segB) => {
  const aH = segA.a.y === segA.b.y;
  const bH = segB.a.y === segB.b.y;
  if (aH === bH) return false;
  const h = aH ? segA : segB;
  const v = aH ? segB : segA;
  const hx1 = Math.min(h.a.x, h.b.x);
  const hx2 = Math.max(h.a.x, h.b.x);
  const vy1 = Math.min(v.a.y, v.b.y);
  const vy2 = Math.max(v.a.y, v.b.y);
  const ix = v.a.x;
  const iy = h.a.y;
  return ix > hx1 && ix < hx2 && iy > vy1 && iy < vy2;
};

export const segmentsOverlap = (a, b) => {
  if (a.orientation !== b.orientation) return false;
  if (a.orientation === "H") {
    if (a.a.y !== b.a.y) return false;
    const a1 = Math.min(a.a.x, a.b.x);
    const a2 = Math.max(a.a.x, a.b.x);
    const b1 = Math.min(b.a.x, b.b.x);
    const b2 = Math.max(b.a.x, b.b.x);
    return Math.max(a1, b1) <= Math.min(a2, b2);
  }
  if (a.a.x !== b.a.x) return false;
  const a1 = Math.min(a.a.y, a.b.y);
  const a2 = Math.max(a.a.y, a.b.y);
  const b1 = Math.min(b.a.y, b.b.y);
  const b2 = Math.max(b.a.y, b.b.y);
  return Math.max(a1, b1) <= Math.min(a2, b2);
};
