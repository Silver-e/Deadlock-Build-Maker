# Build recommendations research

Reviewed 8 November 2026. The app ships a dated local snapshot, not live advice or a generated meta ranking. Recommendations cover the 44 base characters in the current roster; transformed Silver shares normal Silver's item profiles and canonical ability slots.

## Sources and comparison

- [deadlock.gs recommended builds](https://deadlock.gs/builds/) resolves Valve's default build file into match stages and ability steps. This supplies a reproducible baseline, not evidence that a default is optimal. The first default per character is used. Ability sequences whose names do not map exactly to the bundled character kit are withheld.
- [Chudlock builds](https://chudlock.com/builds/) and the linked individual character pages supply observed purchase phases. Every supported character's page was read by the snapshot script. The app compares exact item overlap with the default and exposes both profiles independently. These are population purchases, including alternative choices, rather than one coherent inventory or proof of item strength. Source sample windows differ; the linked pages describe their windows and methods.
- [Deadlock Wiki character pages](https://deadlock.wiki/Ivy) describe kits, scaling, and utility. DBM uses its existing wiki-derived character/item snapshot to check IDs and ability names. Kit scaling helps interpret a profile; it is not itself evidence that the wiki recommends those purchases.
- [Mobalytics build guides](https://mobalytics.gg/deadlock/builds) provide named playstyles. Only inspected guides contribute shortlists; guide dates remain visible. Exact current-catalog matches are used; unavailable names are disclosed rather than silently mapped to different items.
- [Reddit's Geist discussion](https://www.reddit.com/r/DeadlockTheGame/comments/1rfp4d8/whats_the_proper_way_to_build_geist/) provides a community counterpoint to spirit-heavy approaches: spirit lane pressure followed by weapon damage and sustain. It is an older anecdotal discussion with disagreement, not a consensus recommendation. Its gun shortlist remains separate from the observed and default profiles.

## Distinct playstyles

[Spirit Warden by Hydration](https://mobalytics.gg/deadlock/builds/spirit-warden-hydration), updated 15 January 2026, emphasizes Last Stand, duration, and staying close to targets. [Observed Warden purchases](https://chudlock.com/builds/warden/) instead classify the hero as a gunner. The app retains both approaches; it does not combine the older ultimate-focused ability sequence with the observed gun profile.

Ivy illustrates three genuinely different intentions: [Hydration's Thorns carry](https://mobalytics.gg/deadlock/builds/hydration-spirit-carry-ivy), updated 13 October 2026, invests in spirit damage and area control; [Suzu's support guide](https://mobalytics.gg/deadlock/builds/ivy), updated 15 January 2026, emphasizes healing and control; [Y4mz's gun guide](https://mobalytics.gg/deadlock/builds/gun-ivy-y4mz), updated 2 October 2025, provides a historical farming/weapon alternative. The older gun profile is explicitly labeled and should be compared with the observed profile. These are shortlists, not assertions that all listed purchases must coexist in a final loadout.

[Suzu's Bomb Bebop](https://mobalytics.gg/deadlock/builds/suzu-bomb-bebop), updated 13 October 2026, explains the Echo Shard double-bomb combination and Trophy Collector's roaming role. Its small combo shortlist is presented separately from general purchases; no complete ability order is inferred from that explanation.

Research also checked [current Carry Seven](https://mobalytics.gg/deadlock/builds/rina-carry-seven), [Gun Kelvin](https://mobalytics.gg/deadlock/builds/gun-kelvin-sharky), and [LefaaBall Seven](https://mobalytics.gg/deadlock/builds/lefaaball-seven). The latter two explicitly mark themselves outdated, so they were not promoted into active profiles. Named variants are not exhaustive; every character still has the default/observed comparison.

## Behavior and maintenance

The button below character setup opens staged items, original sources, profile notes, and an ability sequence when verified. Users can add one item or all missing items. Additions create or extend `Recommended` categories and skip items already anywhere in the draft. They preserve existing categories, notes, equipment, imbues and ability order. Applying a sequence is a separate, explicit action that replaces only the ability plan. Both actions use normal Undo and local save behavior. Changing character or draft resets the recommendation selection.

`npm run sync:recommendations` refreshes factual default/observed snapshots in `data/recommendations.json`. It fails when expected character or phase data is missing so selector changes cannot silently produce an empty snapshot. Review changes against the linked sources, particularly after a patch or item/hero sync. `data/recommendation-guides.json` holds manually reviewed, dated guide shortlists and sequences. Refreshing population data does not overwrite those curated guides. No source HTML, user identifiers, source prose or source images are shipped with this feature.

`npm test` validates coverage, mapped catalog items, plans, independent styles and safe additions. `npm run test:recommendations` verifies the built site under a non-root Pages path, character selection, sources, applying suggestions, Undo, plan replacement, character changes, and mobile width.
