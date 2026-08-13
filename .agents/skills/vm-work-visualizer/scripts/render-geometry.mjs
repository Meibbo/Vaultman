export const ROUTE_CLEARANCE = 4;

function center(node) {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function direction(from, to, fallback) {
  const delta = { x: to.x - from.x, y: to.y - from.y };
  const length = Math.hypot(delta.x, delta.y);
  if (length === 0) return fallback;
  return { x: delta.x / length, y: delta.y / length };
}

function boundaryPoint(node, unitDirection, clearanceSign) {
  const halfWidth = node.width / 2;
  const halfHeight = node.height / 2;
  const horizontalDistance = unitDirection.x === 0 ? Infinity : halfWidth / Math.abs(unitDirection.x);
  const verticalDistance = unitDirection.y === 0 ? Infinity : halfHeight / Math.abs(unitDirection.y);
  const distance = Math.min(horizontalDistance, verticalDistance);
  const nodeCenter = center(node);
  return {
    x: nodeCenter.x + unitDirection.x * (distance + ROUTE_CLEARANCE * clearanceSign),
    y: nodeCenter.y + unitDirection.y * (distance + ROUTE_CLEARANCE * clearanceSign),
  };
}

function bindingPoint(node, unitDirection) {
  const point = boundaryPoint(node, unitDirection, 0);
  return [
    Number(Math.max(0, Math.min(1, (point.x - node.x) / node.width)).toFixed(6)),
    Number(Math.max(0, Math.min(1, (point.y - node.y) / node.height)).toFixed(6)),
  ];
}

export function routeForEdge(edge, source, target) {
  const waypoints = edge.via ?? [];
  const sourceCenter = center(source);
  const targetCenter = center(target);
  const sourceDirection = direction(sourceCenter, waypoints[0] ?? targetCenter, { x: 1, y: 0 });
  const targetDirection = direction(waypoints.at(-1) ?? sourceCenter, targetCenter, { x: 1, y: 0 });
  const targetBoundaryDirection = { x: -targetDirection.x, y: -targetDirection.y };
  const points = [
    boundaryPoint(source, sourceDirection, 1),
    ...waypoints,
    boundaryPoint(target, targetBoundaryDirection, 1),
  ];
  return {
    points,
    startBinding: {
      elementId: source.id,
      focus: 0,
      gap: ROUTE_CLEARANCE,
      fixedPoint: bindingPoint(source, sourceDirection),
    },
    endBinding: {
      elementId: target.id,
      focus: 0,
      gap: ROUTE_CLEARANCE,
      fixedPoint: bindingPoint(target, targetBoundaryDirection),
    },
  };
}

export function relativePoints(points) {
  const origin = points[0];
  return points.map((point) => [point.x - origin.x, point.y - origin.y]);
}

export function formatNumber(value) {
  return Number(value.toFixed(6)).toString();
}

export function serializePoints(points) {
  return points.map(([x, y]) => `${formatNumber(x)},${formatNumber(y)}`).join(" ");
}
