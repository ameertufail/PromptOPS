export type DiffHunk = {
  content: string;
  type: "added" | "removed" | "unchanged";
};

export function computeLineDiff(
  baseText: string,
  candidateText: string
): DiffHunk[] {
  const baseLines = baseText.split("\n");
  const candidateLines = candidateText.split("\n");
  const m = baseLines.length;
  const n = candidateLines.length;

  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [];

    for (let j = 0; j <= n; j++) {
      if (i === 0 || j === 0) {
        dp[i][j] = 0;
      } else if (baseLines[i - 1] === candidateLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const entries: Array<{ line: string; type: DiffHunk["type"] }> = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && baseLines[i - 1] === candidateLines[j - 1]) {
      entries.unshift({ line: baseLines[i - 1], type: "unchanged" });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      entries.unshift({ line: candidateLines[j - 1], type: "added" });
      j--;
    } else {
      entries.unshift({ line: baseLines[i - 1], type: "removed" });
      i--;
    }
  }

  const hunks: DiffHunk[] = [];

  for (const entry of entries) {
    const last = hunks[hunks.length - 1];

    if (last && last.type === entry.type) {
      last.content += "\n" + entry.line;
    } else {
      hunks.push({ content: entry.line, type: entry.type });
    }
  }

  return hunks;
}
