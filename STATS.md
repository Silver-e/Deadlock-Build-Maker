# Equipped stat calculations

## Combined combat snapshots

`src/combat.js` builds explicit extra sources on top of the same equipment and
character calculation used for standing stats. This works for the whole roster.
Hero buff controls map known self attributes from bundled ability properties and
upgrade data, including attributes that appear only in upgrades. Damage procs,
enemy slows/shred and summoned-unit attributes are not inferred to be self buffs.
Each condition is opt-in. Unknown or scoped effects stay in the ability/item
breakdown; the additional-source editor accepts resolved values for other buffs.
Separate phases of an ability can be selected individually.

Independent positive damage resistances use `100 * (1 - product(1 - r/100))`.
Incoming resistance reductions use that same formula in a separate pool, then
subtract percentage points from the positive resistance result. For example,
40% and 20% resistance combine to 52%; 25% and 20% shred combine to 40%; final
resistance is 12%, not a multiplication of resistance and negative values.
See [Damage Resistance](https://deadlock.wiki/Resistance).

Stacks within one buff first form one source, bounded by its bundled stack cap.
Different resistance/cooldown/duration/range sources diminish; weapon damage and
fire rate bonuses add. Flat bullet damage increases the weapon's damage pool
before its weapon damage multiplier. Percentage movement bonuses are distinct
from diminishing flat movement additions. Ability stamina regeneration rate
increases divide recovery time by `1 + rate/100`; they are not treated as a
percentage reduction that could make recovery negative.

Item spirit multipliers and selected hero spirit gains resolve before other
spirit-scaled hero buffs. Flat spirit includes base/boons and equipment exactly
once. Hero self buffs use their upgraded properties, spirit and boon scaling.
Ambiguous scaled item values require a resolved additional source instead of
guessing their scaling type. Selected effects from an unequipped item or another
hero do not apply. Snapshots save per draft and participate in Undo.

Silver is a transformation preset on top of this shared pipeline. Lycan Curse
uses her transformed base weapon/abilities, applies tier 1's +15% bullet/spirit
resistance only while active, and uses tier/boon-scaled health and movement. Its
fire rate is the full spirit-scaled bonus multiplied by the selected stacks / 15;
zero stacks is the default. See [Silver](https://deadlock.wiki/Silver).

Run `npm run test:combat` for desktop/mobile control, source, persistence and
investment-spike checks; `npm test` includes cross-character numerical cases.

## Standing equipment totals

Only the separately equipped items are counted. Every source has its item ID attached for the UI's source icons and detail buttons. The same item cannot count twice. Existing drafts require no migration.

Permanent item stats and always-on tooltip passives are aggregated, together with the three investment bonuses. Always-on tooltip passives (for example Greater Expansion, Superior Cooldown, Debuff Reducer, and Heroic Aura's passive) are explicitly identified; merely being called “Passive” does not make a triggered effect unconditional.

Flat bonuses add together. Percentage spirit power multiplies the sum of flat spirit power and the spirit investment. Health percentages remain separate from flat bonus health, and max-health multipliers remain separate from base-health bonuses. Without a selected character these remain item-only bonus totals.

Verified stacking references:

- [Damage resistance](https://deadlock.wiki/Damage_Resistance): separate resistance sources use `100 × (1 − ∏(1 − source/100))`.
- [Lifesteal](https://deadlock.wiki/Lifesteal): bullet and spirit lifesteal use that same diminishing formula, independently.
- [Ability range](https://deadlock.wiki/Ability_Range) and [ability duration](https://deadlock.wiki/Ability_Duration): use the wiki's diminishing formula. The wiki example of 30% range plus 10% range yields 37%.
- [Ability cooldown](https://deadlock.wiki/Ability_Cooldown): cooldown reductions multiply their remaining percentages. General, charged, ultimate, and item cooldown modifiers retain separate rows.
- [Spirit power](https://deadlock.wiki/Spirit_Power#Bonus_Spirit_Power): sum flat sources, then apply percentage multipliers.

Conditional bonuses are listed next to the relevant stat with their item's icon and a condition label. Click the marker for the full item description. These listed amounts are not folded into the permanent total. Conditions can be mutually exclusive; per-stack, spirit-scaled, target-only and imbued-only amounts retain their qualifiers rather than pretending all effects apply simultaneously. All effects and their full numeric parameters are additionally shown under **Item effects & conditions**. Enemy resistance reduction and slows do not reduce the equipped hero's own stats. NPC-only bonuses are kept separate from hero-combat totals.

## Characters and ability comparisons

`data/heroes.json` bundles the wiki's selectable heroes with four documented abilities. In-development heroes are labeled Preview; Silver's transformed form is an explicit separate selection. Each draft stores its hero, 0–35 boons, cumulative ability tiers 0–3, per-item imbue assignments, and the target used to preview a new imbue. Missing fields in existing drafts mean no selected character, zero boons and base abilities. Selecting another character resets ability tiers and imbues, retaining the draft and equipment.

Hero stats use the source base values plus `LevelScaling × boons` and `SpiritScaling × total spirit`. [Spirit power](https://deadlock.wiki/Spirit_Power) includes innate/boon spirit, flat equipped item spirit and Spirit investment inside the percentage multiplier. [Health](https://deadlock.wiki/Health) is `(base + boon health) × (1 + base-health bonuses) + flat bonus health`, followed by max-health multipliers and rounding up. [Move speed](https://deadlock.wiki/Movement_Speed) bonuses use `12 × (1 − ∏(1 − bonus/12))`; sprint bonuses add. Weapon DPS is continuous firing before reloads, headshots, falloff or target resistance. Standing character totals do not assume ability-granted buffs or combat-dependent hero passives.

Ability tiers apply each earlier tier's deltas and scaling changes. Properties use only their declared wiki scaling tags: linear spirit and boon terms; weapon-damage bonuses; light/heavy melee totals; and range/radius, duration, healing, cooldown and charge modifiers. An untagged fixed duration does not grow with Ability Duration. [Kinetic Carbine](https://deadlock.wiki/Paradox) uses full-burst weapon damage rather than flat spirit or only bonus weapon damage. [Weapon Damage](https://deadlock.wiki/Weapon_Damage) documents the other weapon-scaling abilities. Rank multipliers and light-to-heavy melee conversions retain the source's Multiply flags. Ability units, native stat icons, filters and upgrade descriptions are taken from the rendered wiki cards to avoid ambiguous stat labels.

[Imbues](https://deadlock.wiki/Imbue) affect their assigned ability only. Mystic Expansion and Duration Extender may target passives; other imbues cannot. Echo Shard cannot target the ultimate. Only the permanent ability range/duration/cooldown/spirit part contributes to numeric ability comparisons. Triggered damage, temporary fire rate, active resets, lifesteal and stack-dependent buffs remain in the item effects and conditions; they are not silently added to base ability damage.

Hover comparisons start from equipped items, never every draft item. A proposed upgrade consumes owned components, so both stat bonuses and investment are recalculated without double counting. An already-equipped item compares removal against the current loadout. Components already covered by an equipped upgrade are identified instead of added. Slot/active-limit overflows are labeled hypothetical. Values are before enemy resistance, debuff resistance, target health, damage amplification and live combat events. This is a drafting calculator, not a combat simulator.

The structured `effectGroups` in `data/items.json` preserve each tooltip passive/active's description and its own parameters. `scripts/sync-items.mjs` rebuilds these groups from the wiki's default tooltip. Enhanced and Street Brawl variants are excluded as before.
