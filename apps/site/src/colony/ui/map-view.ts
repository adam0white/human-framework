/** UI camera only. It never changes a person's position or the simulation clock. */
export interface MapPoint {
  x: number;
  y: number;
}
export interface MapView extends MapPoint {
  width: number;
  height: number;
}

export function mapView(
  cssWidth: number,
  cssHeight: number,
  worker: MapPoint | null,
  destination: MapPoint | null,
  pan: MapPoint | null = null,
): MapView {
  const aspect = cssWidth / Math.max(1, cssHeight);
  let height = 448;
  let width = height * aspect;
  if (aspect >= 640 / 448) {
    width = 640;
    height = width / aspect;
  }
  const points = [worker, destination].filter((p): p is MapPoint => p !== null);
  if (points.length > 1 && !pan) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    // Leave at least 32 CSS px around both ends, including their labels and reply tails.
    width = Math.max(width, (Math.max(...xs) - Math.min(...xs)) / Math.max(0.2, 1 - 64 / cssWidth));
    height = Math.max(
      height,
      (Math.max(...ys) - Math.min(...ys)) / Math.max(0.2, 1 - 64 / cssHeight),
      width / aspect,
    );
    width = height * aspect;
  }
  const centre =
    pan ??
    (points.length
      ? {
          x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
          y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
        }
      : { x: 320, y: 224 });
  const clamp = (value: number, size: number, full: number) =>
    size >= full ? (full - size) / 2 : Math.max(0, Math.min(full - size, value - size / 2));
  const fit = (axis: 'x' | 'y', size: number, full: number, css: number) => {
    const base = clamp(centre[axis], size, full);
    if (points.length < 2 || pan) return base;
    const values = points.map((p) => p[axis]);
    const padding = (32 * size) / css;
    return Math.min(Math.min(...values) - padding, Math.max(Math.max(...values) + padding - size, base));
  };
  return { x: fit('x', width, 640, cssWidth), y: fit('y', height, 448, cssHeight), width, height };
}

export function mapPoint(point: MapPoint, view: MapView, width: number, height: number): MapPoint {
  return { x: ((point.x - view.x) * width) / view.width, y: ((point.y - view.y) * height) / view.height };
}
