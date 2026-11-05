export const ABILITY_SLOTS = ["1", "2", "3", "4"];
export const UPGRADE_COSTS = [0, 1, 2, 5];
export const MAX_ABILITY_STEPS = 16;

// The first occurrence unlocks the ability; the next three buy its upgrade tiers.
export function validAbilityOrder(order) {
  return (
    Array.isArray(order) &&
    order.length <= MAX_ABILITY_STEPS &&
    order.every((slot) => ABILITY_SLOTS.includes(slot)) &&
    ABILITY_SLOTS.every((slot) => order.filter((s) => s === slot).length <= 4)
  );
}

export function abilityPlanSteps(order = []) {
  const counts = {};
  return order.map((slot, index) => {
    const tier = counts[slot] || 0;
    counts[slot] = tier + 1;
    return { slot, index, tier, cost: UPGRADE_COSTS[tier], unlock: tier === 0 };
  });
}

export function setAbilityStep(order, index, slot) {
  if (!Number.isInteger(index) || index < 0 || index > order.length)
    return order;
  const next = [...order];
  next[index] = slot;
  // When a row is full, exchange an existing step instead of forcing a reset.
  if (
    !validAbilityOrder(next) &&
    index < order.length &&
    ABILITY_SLOTS.includes(slot)
  ) {
    const swap = order.findIndex((s, i) => s === slot && i > index);
    const other = swap >= 0 ? swap : order.findIndex((s) => s === slot);
    if (other >= 0) next[other] = order[index];
  }
  return validAbilityOrder(next) ? next : order;
}
