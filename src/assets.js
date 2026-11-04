// Snapshot paths stay independent of the address used to host the planner.
export function assetUrl(path) {
  if (!path?.startsWith("/") || path.startsWith("//")) return path;
  return `${import.meta.env?.BASE_URL ?? "/"}${path.slice(1)}`;
}
