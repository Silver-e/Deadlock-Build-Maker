// Scale types come from the Deadlock Wiki's AbilityData snapshot.
const sources = {
  spirit: "Spirit Power",
  power_increase: "Boon",
  weapon_damage_increase: "Bonus Weapon Damage (%)",
  melee: "Light Melee Damage",
  heavy_melee: "Heavy Melee Damage",
};
const modifiers = {
  duration: "Ability Duration",
  healing: "Outgoing Healing",
  cooldown: "Cooldown Reduction",
  radius: "Ability Range",
  range: "Ability Range",
  max_charges: "Bonus Ability Charges",
  charge_cooldown: "Faster Time Between Charges",
  weapon_damage: "Weapon Damage",
};

export function abilityScaling(property) {
  return [property.Scale]
    .flat()
    .filter((s) => s && Number(s.Value) !== 0)
    .map((s) => {
      const coefficient = Number(s.Value);
      if (sources[s.Type])
        return `Scales with ${sources[s.Type]} × ${coefficient}`;
      if (s.Type === "weapon_power")
        return `Scales with Base Weapon Damage × ${1 + coefficient / 100}`;
      const source = modifiers[s.Type] || s.Type.replaceAll("_", " ");
      return `Affected by ${source}${coefficient === 1 ? "" : ` × ${coefficient}`}`;
    });
}
