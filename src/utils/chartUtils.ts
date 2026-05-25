/**
 * Compute a linear trendline over an array of objects.
 * Reads `d[valueKey]` for each point. Returns the same array
 * augmented with a `trend` field.
 */
export function addTrendline(data: any[], valueKey = 'value') {
  const pts = data
    .map((d, i) => ({ i, v: parseFloat(d[valueKey]) }))
    .filter((p) => !isNaN(p.v));
  if (pts.length < 2) return data.map((d) => ({ ...d, trend: undefined }));

  const n = pts.length;
  const sumX = pts.reduce((a, p) => a + p.i, 0);
  const sumY = pts.reduce((a, p) => a + p.v, 0);
  const sumXY = pts.reduce((a, p) => a + p.i * p.v, 0);
  const sumXX = pts.reduce((a, p) => a + p.i * p.i, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return data.map((d) => ({ ...d, trend: undefined }));
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return data.map((d, i) => ({
    ...d,
    trend: parseFloat((slope * i + intercept).toFixed(2)),
  }));
}

/**
 * Calculate a nice Y-axis domain from data values with ~15% padding.
 */
export function calcDomain(data: any[], key = 'value') {
  const vals = data.map((d) => parseFloat(d[key])).filter((v) => !isNaN(v));
  if (vals.length === 0) return [0, 100];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.15, 1);
  return [
    parseFloat((min - pad).toFixed(1)),
    parseFloat((max + pad).toFixed(1)),
  ];
}

/**
 * Abbreviated date label for X-axes: "2024-04-10" → "Apr 10"
 */
export function formatDateTick(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Returns a color between Green (120) and Red (0) based on value position in range.
 */
export const getGradientColor = (
  value: number | string,
  best: number,
  worst: number
) => {
  if (value === null || value === undefined || best === worst || value === '')
    return '#888';

  const val = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(val)) return '#888';

  const min = Math.min(best, worst);
  const max = Math.max(best, worst);
  const clamped = Math.max(min, Math.min(max, val));

  let pct;
  if (best > worst) {
    pct = (clamped - worst) / (best - worst);
  } else {
    pct = (worst - clamped) / (worst - best);
  }

  const hue = pct * 120;
  return `hsl(${hue}, 70%, 45%)`;
};
