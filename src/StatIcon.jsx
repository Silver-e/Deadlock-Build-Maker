import { assetUrl } from "./assets.js";
import React from "react";
import { statIconPath, statIconFilter } from "./statIcons";
export default function StatIcon({ stat, size = 18, property }) {
  const src = property?.statIcon || statIconPath(stat);
  return src ? (
    <img
      className="stat-symbol"
      src={assetUrl(src)}
      style={{ filter: property?.statFilter ?? statIconFilter(stat, src) }}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  ) : null;
}
