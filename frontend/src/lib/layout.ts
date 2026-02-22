/**
 * Assigns non-overlapping columns to a set of time ranges.
 * Events that don't overlap get full width (totalCols = 1).
 * Events that do overlap share only the space they need.
 */
export function layoutEvents(
  ranges: Array<{ startMin: number; endMin: number }>,
): Array<{ col: number; totalCols: number }> {
  const n = ranges.length;
  const cols = new Array<number>(n).fill(0);
  const colEnds: number[] = [];

  const byStart = [...ranges.keys()].sort((a, b) => ranges[a].startMin - ranges[b].startMin);
  for (const i of byStart) {
    let c = colEnds.findIndex(end => ranges[i].startMin >= end);
    if (c === -1) { c = colEnds.length; colEnds.push(0); }
    cols[i] = c;
    colEnds[c] = ranges[i].endMin;
  }

  return ranges.map((r, i) => {
    let maxCol = cols[i];
    for (let j = 0; j < n; j++) {
      if (j !== i && r.startMin < ranges[j].endMin && ranges[j].startMin < r.endMin) {
        maxCol = Math.max(maxCol, cols[j]);
      }
    }
    return { col: cols[i], totalCols: maxCol + 1 };
  });
}
