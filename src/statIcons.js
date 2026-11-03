import mapping from "../data/stat-icons.json" with { type: "json" };
const native = (name) => `/stat-icons/${name}.png`;
const tint = {
  weapon:
    "brightness(0) saturate(100%) invert(80%) sepia(42%) saturate(6295%) hue-rotate(355deg) brightness(104%) contrast(85%)",
  vitality:
    "brightness(0) saturate(100%) invert(66%) sepia(32%) saturate(1046%) hue-rotate(95deg) brightness(103%) contrast(102%)",
  spirit:
    "brightness(0) saturate(100%) invert(78%) sepia(43%) saturate(4738%) hue-rotate(215deg) brightness(100%) contrast(102%)",
};
const monochrome = new Set([
  "Cooldown_Icon",
  "AttributeIconTechCooldown",
  "AttributeIconTechCooldownBetweenChargeUses",
  "AttributeIconTechRange",
  "AttributeIconTechDuration",
  "AttributeIconFireRate",
  "AttributeIconClipSize",
  "Clip_size_icon",
  "AttributeIconBulletSpeed",
  "AttributeIconMaxChargesIncrease",
  "AttributeIconReloadTime",
  "Fire_Rate",
  "Move_speed",
  "MoveSlow",
  "Healing",
  "Health",
  "Stamina",
  "Stamina_recharge",
  "Melee_damage",
  "Melee_damage_light",
  "Debuff_resist",
]);
export function statIconFilter(text = "", src = statIconPath(text)) {
  const filename = src
    ?.split("/")
    .pop()
    ?.replace(/\.png$/, "");
  if (!monochrome.has(filename) || text === "Cooldown") return "none";
  const raw = text
    .replace(/\s+x[+−-]?\d+(?:\.\d+)?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const exact = mapping.byRawFilter?.[raw];
  if (exact && exact !== "none") return exact;
  if (
    /Slow Resist|Health|Heal|Regen|Move Speed|Sprint|Stamina|Dash|Slide|Debuff|Gravity|Air Control|Fly Speed|Footstep/.test(
      text,
    )
  )
    return tint.vitality;
  if (/Fire Rate|Ammo|Bullet|Clip|Reload|Melee|Weapon/.test(text))
    return tint.weapon;
  if (
    /Ability|Cooldown|Duration|Range|Radius|Spirit|Time|Delay|Interval|Cast Window/.test(
      text,
    )
  )
    return tint.spirit;
  return mapping.byLabelFilter?.[text] || "none";
}
const canonical = {
  Cooldown: native("Cooldown_Icon"),
  "Spirit scaling": native("Spirit_scaling"),
  "Weapon DPS": native("Bullet_damage"),
  "Light Melee Damage": native("Melee_damage_light"),
  "Heavy Melee Damage": native("Melee_damage"),
  "Ability Range": native("AttributeIconTechRange"),
  "Ability Duration": native("AttributeIconTechDuration"),
  "Ability Cooldown Reduction": native("AttributeIconTechCooldown"),
  "Item Cooldown Reduction": native("Cooldown_Icon"),
  "Fire Rate": native("AttributeIconFireRate"),
  "Max Ammo": native("AttributeIconClipSize"),
  "Bonus Ability Charges": native("AttributeIconMaxChargesIncrease"),
  "Bullet Velocity": native("AttributeIconBulletSpeed"),
  "Bullet Lifesteal": native("AttributeIconBulletLifesteal"),
  "Spirit Lifesteal": native("AttributeIconSpiritLifesteal"),
  "Reload Time": native("AttributeIconReloadTime"),
  "Melee Resist": native("Melee_Armor"),
  "Debuff Resist": native("Debuff_resist"),
  Stamina: native("Stamina"),
  "Stamina Recovery": native("Stamina_recharge"),
  "Move Speed": native("Move_speed"),
  "Sprint Speed": native("Move_speed"),
  "Health bonus": native("Health"),
  "Max Health": native("Health"),
  "Bonus Health": native("Health"),
  "Spirit power multiplier": native("Spirit_damage"),
  "Charged ability spirit power": native("Spirit_damage"),
  "Out of Combat Regen": native("Healing"),
  "Outgoing Healing": native("Healing"),
  "Cooldown Reduction For Charged Abilities": native(
    "AttributeIconTechCooldown",
  ),
  "Ultimate Cooldown Reduction": native("AttributeIconTechCooldown"),
  "Faster Time Between Charges": native(
    "AttributeIconTechCooldownBetweenChargeUses",
  ),
  "Weapon Fall-off Range": native("AttributeIconTechRange"),
  "Weapon Zoom": native("AttributeIconTechRange"),
  "Heavy Melee Distance": native("Melee_damage"),
  "Slide Distance": native("Move_speed"),
  "Air Jump/Dash Distance": native("Move_speed"),
  "Parry Cooldown": native("Cooldown_Icon"),
  "Gravity Scale": native("Move_speed"),
  "Air Control": native("Move_speed"),
  "Footstep Sound Distance": native("Move_speed"),
};
export function statIconPath(text = "") {
  const raw = text
    .replace(/\s+x[+−-]?\d+(?:\.\d+)?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const label = raw.replace(/^[+−-]?\d[\d.,]*(?:%|m\/s|HP\/s|m|s|\/s)?\s+/, "");
  if (canonical[text]) return canonical[text];
  if (mapping.byRaw[raw]) return mapping.byRaw[raw];
  if (canonical[label]) return canonical[label];
  if (mapping.byLabel[label]) return mapping.byLabel[label];
  if (
    /Cooldown|Restore Delay|Time Frame|Time for|Delay|Interval|Immunity Duration/.test(
      label,
    )
  )
    return native("Cooldown_Icon");
  if (/Duration|Cast Window/.test(label))
    return native("AttributeIconTechDuration");
  if (/Range|Radius|Min\. Distance|Close Range|Jump Radius/.test(label))
    return native("AttributeIconTechRange");
  if (/Ammo|Bullets|Clip/.test(label)) return native("AttributeIconClipSize");
  if (/Spirit.*Resist/.test(label)) return native("Spirit_Armor");
  if (/Bullet.*Resist|Deflection|On-Hit Prevention/.test(label))
    return native("Bullet_Armor");
  if (/Melee.*Resist/.test(label)) return native("Melee_Armor");
  if (/Debuff.*Resist/.test(label)) return native("Debuff_resist");
  if (/Slow Resist|Move Speed|Sprint|Dash|Slide|Fly Speed/.test(label))
    return native("Move_speed");
  if (/Fire Rate|Multishot/.test(label)) return native("AttributeIconFireRate");
  if (/Spirit Power|Spirit Amp|Imbued Ability Spirit/.test(label))
    return native("Spirit_damage");
  if (/Weapon Damage|Head Shot|Bullet Damage|Ricochet/.test(label))
    return native("Bullet_damage");
  if (/Melee|Heavy Damage/.test(label)) return native("Melee_damage");
  if (/Heal|Regen|Lifesteal/.test(label))
    return /Drain|Penalty|Loss|Incoming/.test(label)
      ? native("Damage_heart")
      : native("Healing");
  if (/Stamina/.test(label)) return native("Stamina");
  if (/Damage/.test(label)) return native("Spirit_damage");
  if (/Soul/.test(label)) return native("Souls");
  return null;
}
