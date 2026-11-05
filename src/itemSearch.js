import { parseStat } from "./stats.js";

const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[-\s]+/g, " ")
    .trim();
const statLines = (item) => [
  ...(item.stats || []),
  ...(item.effectGroups || []).flatMap((effect) => effect.stats || []),
];

export function itemStatLabels(items) {
  return [
    ...new Set(
      items.flatMap((item) =>
        statLines(item)
          .map((line) => parseStat(line)?.label)
          .filter(Boolean),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

// Include prose for bonuses without a numeric stat row (e.g. activation buffs).
export function itemMatchesStat(item, query) {
  const words = normalize(query).split(" ").filter(Boolean);
  const text = normalize(
    [
      ...statLines(item),
      ...itemStatLabels([item]),
      ...(item.effects || []),
      ...(item.effectGroups || []).map((effect) => effect.description || ""),
      item.description || "",
    ].join(" "),
  );
  return words.every((word) => text.includes(word));
}
