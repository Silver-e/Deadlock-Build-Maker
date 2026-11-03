# Asset provenance

## Attribute and effect icons

Several native attribute icons are monochrome assets whose game colors are applied separately. `data/stat-icons.json` preserves the wiki tooltip's original per-stat CSS filters. `StatIcon` uses those source filters and the same orange/green/purple palette for matching equipped-stat labels. This tinting is restricted to monochrome symbols; multi-colored game icons and item illustrations remain unchanged. The plain cooldown clock in an active-effect header intentionally retains its original white treatment.

`data/stat-icons.json` records the exact original URL for every image under `public/stat-icons/`, plus stat-label and tooltip mappings extracted from the default wiki item tooltips. These are downloaded unchanged by `scripts/sync-stat-icons.mjs`, which also preserves the game's `IsImbue` flag on each item. The original game icons include cooldown, range, duration, spirit scaling, resistances, health, movement, ammunition, lifesteal, stamina, and status effects. Runtime uses the local files; no wiki connection is required. Game artwork belongs to Valve or its respective owners.

## Category icons

- `public/icons/Weapon.png`: https://cdn.deadlock.wiki/Weapon_Icon.png
- `public/icons/Spirit.png`: https://cdn.deadlock.wiki/Spirit_Icon.png
- `public/icons/Vitality.png`: https://cdn.deadlock.wiki/Vitality_Icon.png

Original game category icons, downloaded unchanged and rendered without filters or blending. Game artwork belongs to Valve or its respective owners.

## Game tooltip skins

Each file under `public/tooltips/` is downloaded unchanged from `https://cdn.deadlock.wiki/` using the exact same file name:

- `Tooltip_backer_weapon_psd.webp`
- `Tooltip_backer_spirit_psd.webp`
- `Tooltip_backer_vitality_psd.webp`
- `Catalog_tooltip_header_weapon_psd.webp`
- `Catalog_tooltip_header_spirit_psd.webp`
- `Catalog_tooltip_header_vitality_psd.webp`

These original game backings supply the tooltip's silhouette, surface artwork, and category header, following the wiki's in-game item infobox treatment. They belong to Valve or their respective owners. `public/fonts/ValvePulp-Bold.woff2` is downloaded unchanged from https://cdn.deadlock.wiki/ValvePulp-Bold.woff2 and supplies the game's numeric lettering.

## Game tier cards

The local `public/cards/` assets below are downloaded unchanged from `https://cdn.deadlock.wiki/`. The matching file name forms the exact source URL. The mapping follows [Deadlock Wiki's ItemBox](https://deadlock.wiki/Template:ItemBox/styles.css), which uses these game assets to reproduce shop price tiers.

| Local file | Category / tier |
| --- | --- |
| Weapon_Card_T1.png | Weapon / 800 |
| Weapon_Card_T2.png | Weapon / 1,600 |
| Weapon_Card_T3.png | Weapon / 3,200 |
| Weapon_Card_T4.png | Weapon / 6,400 |
| Tech_Card_T1.png | Spirit / 800 |
| Tech_Card_T2.png | Spirit / 1,600 |
| Tech_Card_T3.png | Spirit / 3,200 |
| Tech_Card_T4.png | Spirit / 6,400 |
| Armor_Card_T1.png | Vitality / 800 |
| Armor_Card_T2.png | Vitality / 1,600 |
| Armor_Card_T3.png | Vitality / 3,200 |
| Armor_Card_T4.png | Vitality / 6,400 |
| Icon_mask01.png | Original soft paper-edge icon mask |

These are game assets owned by Valve or their respective owners. Item illustrations render in normal color, without multiply blending. The card art provides the tier coloration; it is not a filter on the illustration.

The local wiki snapshot is fetched by `scripts/sync-items.mjs`. For every `public/items/<id>.png`, the record with the same `id` in `data/items.json` records the exact original image URL in `iconSource` and its item page in `source`. Icons are downloaded unchanged. All game art belongs to Valve or the respective owner.

`public/souls.png`: https://cdn.deadlock.wiki/Souls.png — downloaded unchanged.

Bundled fonts, downloaded unchanged:

- `public/fonts/Retaildemo-regular.woff2`: https://cdn.deadlock.wiki/Retaildemo-regular.woff2
- `public/fonts/Retaildemo-bold.woff2`: https://cdn.deadlock.wiki/Retaildemo-bold.woff2
- `public/fonts/ValveOccult-SemiBold.woff2`: https://cdn.deadlock.wiki/ValveOccult-SemiBold.woff2

`public/favicon.svg` and the small control icons in `src/main.jsx` are original geometric interface drawings. No generated imagery is used.

The development-only `reference.jpg` is an in-game screenshot from https://media.esports.gg/uploads/2024/09/Deadlock-create-a-build-4.jpg, used as visual reference. It is not part of the shipped site.

## Character and ability artwork

`data/heroes.json` records every hero's wiki page and the exact original image URLs. `public/heroes/<hero-id>.png` contains the game's head portrait from `portraitSource`; `public/abilities/<hero-id>-<slot>.png` contains the original ability icon from each ability's `iconSource`. Both are sourced from the corresponding wiki hero card and downloaded without visual alteration by `scripts/sync-heroes.mjs`. Native per-property icons under `public/stat-icons/` retain `statIconSource` and the wiki's original CSS filter in each ability property. Origin text is embedded into the shipping PNG metadata as well. Artwork belongs to Valve or the respective owner; no generated hero or ability art is used.

Hero statistics, ability descriptions, upgrade text and scaling definitions are adapted from Deadlock Wiki's HeroData, AbilityCards, AbilityData, Lang_en and rendered hero pages, under CC BY-SA 4.0, with sources retained in the dataset. The bundled dataset and text adaptations retain that license. The license does not cover Valve's game artwork.
