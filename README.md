# Deadlock Build Maker (DBM)

A local recreation of the Curiosity Shop and build editor. No accounts, Steam integration, public builds, sharing, or runtime API calls.

## Run on Windows

Double click **Start planner.cmd**, or run:

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. Keep the terminal open while using the app. Node.js 22.12 or newer is required. After dependencies are installed, the app works without internet; the local server still needs to run. It only listens on this computer.

For a production build, run `npm run build`, then `npm run preview` and open http://127.0.0.1:4173. Drafts belong to the browser and address used: development and preview use separate browser storage.

## GitHub Pages

The planner can also run as a static website without a local server. The
`.github/workflows/deploy.yml` workflow tests, builds, and deploys every push to
`main`. In the GitHub repository's **Settings → Pages**, select **GitHub Actions**
as the source. GitHub Pages must be available for the repository's visibility
and account plan.

The workflow gets the hosting path from GitHub Pages, so bundled images, fonts,
and tooltips work under the repository URL as well as a custom domain. Local
development continues to use `/`. To build for a particular subdirectory manually:

```powershell
$env:PAGES_BASE_PATH = "/Deadlock-Build-Maker/"
npm run build
npm run preview
```

Open the same subdirectory on the preview server. Remove the override with
`Remove-Item Env:\PAGES_BASE_PATH` when finished. Run `npm run test:pages` to build
and smoke-test deployment under a subdirectory (requires Playwright Chromium).

Drafts stay in each browser's local storage. Drafts created on localhost do not
automatically transfer to the hosted site, and there is no cross-device sync.
Item and hero data remain bundled snapshots; refreshing them and pushing to
`main` deploys an updated snapshot.

## Use

Choose a **Character** for each draft. Its portrait appears beside the name in **My drafts**. Existing drafts remain usable without a character. Set **Boons** and open **Ability upgrades & imbues** to choose cumulative ability tiers and the targets of equipped imbue items. These settings save with the draft and support Undo.

With a character selected, hovering a shop/build item automatically shows the affected abilities' **before → after** values against the equipped loadout. No ALT key is needed. The info button includes the same comparison for touch users. The **New item imbue preview** target controls hypothetical imbues; equipped imbues keep their own assignments. Upgrades replace their components in the comparison. For an equipped item, the comparison is **without the item → current loadout**. A full inventory is identified as hypothetical.

**Loadout & stats** shows character totals and expandable ability details above the existing item bonus breakdown. Damage is before enemy resistance. Temporary buffs, triggered procs, combat stacks, and enemy-dependent effects stay separate rather than being assumed active. Silver's transformed form is selectable separately; in-development characters are labeled Preview.

New builds begin with **Early Game**, **Mid Game**, **Late Game**, and **Optional**. The last is marked optional by default. Each category has an **Optional category** checkbox; regular sections are warm tan and optional sections are blue-gray, with optional status also identified in the shop's destination selector. This flag is saved with the draft and supports Undo. Optional items can still be equipped and count normally in loadout stats. Existing drafts keep their categories, with legacy missing flags treated as off.

The top tabs open separate full-width views: **Build**, **Weapon**, **Vitality**, **Spirit**, and **Loadout & stats**. On the build page, select a category and choose **Add items**. In the shop, the destination selector changes which category receives items; **Return to build** brings you back to the full editor. The investment bars and equipment occupy the loadout page rather than crowding the build.

- Click a category to choose where shop items go. Click a shop item to add or remove it from that category.
- Click an item in the draft to equip or unequip it. Shift click a shop item to equip it directly.
- The info button opens the full item description, stats, components, and upgrades. The detail panel also has add and equip buttons.
- Hover a shop or draft item to preview its stats, descriptions, effects and cooldowns before clicking. Keyboard focus shows the same preview. Move onto a long tooltip to scroll it; press Escape to dismiss it. Touch users can use the info button.
- Imbue-capable items have a purple IMBUE ribbon inside their artwork. Hover previews and equipped stats use bundled native game attribute/effect icons; conditional bonuses retain the source item icon as well.
- Drag items to reorder them or move them between categories. Use the category arrows to reorder categories, the expand control for full or half width, and the trash control to remove a category. Undo reverses changes to the current build.
- Rename categories and add notes directly in their fields. Drafts may contain alternatives, duplicates across categories, and more than 12 items.
- Click equipped items to remove them. Right click an equipped item to inspect it. Extra slots can be set from zero to three; all are unlocked by default for planning a full build.
- **My drafts** switches between drafts saved in this browser. Changes save automatically. Clearing site data or using a different browser/profile will not retain these drafts.
- Click an investment bar to expand its threshold table.

## Calculations

The Weapon, Vitality, and Spirit bars use **only equipped items**, independently of draft categories. Investment is the sum of the full listed cost of currently equipped items of that type. Component upgrades consume equipped components; their value is included once in the upgraded item. The bars use the discrete cumulative investment table under **Item Types → Investment bonuses** at https://deadlock.wiki/Items. They cap their display and bonus at 28,800 souls; the soul value itself can exceed that amount. Removing an item removes its investment.

These bars are investment bonuses. Character totals additionally include hero base stats, boon scaling and equipped item bonuses; ability values include the selected ability upgrades, scaling and permanent assigned imbues. Enhanced/Street Brawl items and live combat simulation are outside this planner's scope.

The **Loadout & stats** page also shows combined permanent item bonuses, including investments. Expand any item bonus to inspect its sources. Conditional bonuses have small item-icon markers beside the relevant stat; click one to inspect the item. Actives, triggered bonuses, stacking buffs, and imbued-only stats stay separate from global item totals. Their complete conditions and parameters appear below under **Item effects & conditions**, including enemy debuffs. See [STATS.md](STATS.md) for stacking formulas and wiki references.

## Item data and refresh

`data/items.json` is a bundled snapshot of all 156 standard shop items. Item icons and fonts are bundled under `public/`. No wiki access is needed to use the app. The footer shows when the snapshot was retrieved. This is a snapshot, not a live patch feed.

To intentionally refresh the snapshot (requires internet):

```powershell
npm run sync:items
npm test
npm run build
```

The sync script reads the current standard-shop list, item data, rendered default tooltips, and icons from Deadlock Wiki. Investment thresholds are explicitly stored in `src/model.js`; update those from the wiki table if a future patch changes them. Existing saved drafts referring to removed items may require migration after a future catalog refresh.

Item refresh also runs `scripts/sync-stat-icons.mjs` to preserve the source imbue flags and rebuild the native stat-icon assets and mappings in `data/stat-icons.json`.

`npm run sync:heroes` independently refreshes `data/heroes.json`, hero head portraits, ability artwork, ability stat icons/units and upgrade descriptions from the wiki's HeroData, AbilityCards, AbilityData and Lang_en datasets plus rendered hero pages. Each hero and image retains its original source URL. All character data and artwork is bundled locally; no requests to the wiki are made while using the app.

## Verification

`npm test` checks investment thresholds and boundaries, upgrade component consumption, duplicate handling, removals, slot limits, active limits, and catalog completeness. `npm run test:ui` runs Playwright against the running development server (install Chromium first with `npx playwright install chromium`) and checks the main editing flow, persistence, filters, layout, and operation with external requests blocked.

Character math and asset completeness are also checked by `npm test`. Run `node tests/heroes-ui.mjs` for character selection, ability/imbue controls, before-and-after previews, portraits, per-draft persistence and mobile checks against the dev server.

## Attribution

Item descriptions, statistics, relationships, and investment table: [Deadlock Wiki](https://deadlock.wiki/Items), adapted under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Each item record retains its source link. The bundled dataset and adaptations of that text are available under the same license. Game artwork and game typefaces belong to Valve and their respective owners; they are not covered by the text license. This is an unofficial fan tool, unaffiliated with Valve.
