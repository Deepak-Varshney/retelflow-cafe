/**
 * Compare two semver strings: returns true if current < target
 */
export function isVersionOlder(current: string, target: string): boolean {
  if (!target || !current) return false;
  const p1 = String(current).trim().replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const p2 = String(target).trim().replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const v1 = p1[i] || 0;
    const v2 = p2[i] || 0;
    if (v1 < v2) return true;
    if (v1 > v2) return false;
  }
  return false;
}
