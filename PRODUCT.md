# Deadlock build planner

## Platform
Local web app, desktop first, with responsive fallback. No account, Steam connection, hosted services, public builds, or sharing.

## Purpose
Draft Deadlock builds outside the game. Browse the current shop, inspect item descriptions and stats, organize items into named categories, and save drafts on this computer.

## Confirmed behavior
New drafts start with Early Game, Mid Game, Late Game, and Optional. Only the default Optional category is marked optional. Every category has a persisted, undoable optional toggle with a distinct visual treatment. Optional choices remain manually equippable and count normally in equipped stats. Existing drafts retain their category names, order, and content; missing legacy optional flags behave as false.
The three investment bars calculate from a separate equipped loadout, not every item in the draft. Component upgrades must replace their components, duplicates must not inflate investment, and removing an item must remove its investment. Drafts may include alternatives and more items than can be equipped.

The editor, shop categories, and equipped loadout/stats occupy separate full-width pages, following the game's tab structure. The equipped stats page aggregates permanent item bonuses and investments, and identifies conditional, active, imbued, stacking, and target effects with their originating item icons. Conditions do not inflate permanent totals. All effect text and numeric parameters remain visible.

Each draft may select a character with a head portrait in My drafts, boon level, cumulative ability upgrades and equipped imbue targets. Character totals combine base/boon stats and equipped bonuses. Item hovers automatically show affected ability values before and after hypothetical equipment, without an ALT key. Upgrades consume components and imbues affect only their assigned ability. Existing drafts without a character continue to work. Live combat buffs, procs and stacks are not assumed active.

## Visual authority
User explicitly requests the game's shop and build editor UI/UX: dense item catalog by tier, weapon orange, vitality green, spirit purple, warm ivory lettering and dark olive shop surfaces. This is a reproduction of an established visual world, not a new identity.

## Data
Bundle a local snapshot of Deadlock Wiki item text, icons, and investment rules, with attribution and optional maintainer refresh script. Runtime must work offline after installation.
