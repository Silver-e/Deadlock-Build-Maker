# Shop and build editor

Mode: Operate. Desktop web, responsive single-column fallback.

Character setup sits beneath the existing page tabs. A game head portrait, native character selector, boon selector and hypothetical imbue target form a compact shared row. Ability upgrades and equipped imbue assignments expand inline. My drafts pairs each saved name with its character head and name. The loadout page adds character totals in Weapon / Spirit / Vitality order and expandable native-icon ability details above the existing item bonus breakdown. Item tooltips append automatic character-aware before/after values using the same native artwork, type, colors and units. This extension inherits the existing visual system; DESIGN.md and its token sidecar remain unchanged.

New builds have Early Game, Mid Game, Late Game and Optional categories. Standard sections use warm tan with darker brown headers; optional sections use blue-gray with darker slate headers, following the in-game build UI. Both use light text and solid boundaries, with a clear selection outline independent of optional status. The Optional category control remains in the footer. Any category may be toggled; its optional state is also visible while choosing a shop destination. This is independent from equipping items and calculating stats.

Shop and draft tiles use the original Weapon/Tech/Armor card backgrounds per tier, bundled under public/cards. Tiers progress from pale paper through category-colored middle tiers to dark tier-four cards with light labels. Item illustrations render at normal color with the game's soft paper-edge mask; no multiply blend is applied to artwork, tooltip icons, or detail icons.

Active item tiles have rounded corners and a compact dark ACTIVE badge straddling the artwork/name boundary, following the game's ItemBox treatment. Keep the name below the badge, rather than using a full-width footer strip. This applies equally in catalogs and build categories.

Active artwork also uses a circular image silhouette, as clarified by the user. Preserve the rounded card and ACTIVE badge alongside this distinction; passive artwork retains its paper-edge square mask.

Imbue-capable items use the game's purple IMBUE ribbon inside the artwork. On active imbues, place it above the separate ACTIVE tab. Use the source IsImbue flag, never a text heuristic. Hover values, cooldown headers, spirit scaling, equipped-stat rows and effect parameters use bundled native attribute/effect icons, with source mappings in data/stat-icons.json. Keep the originating item icons on conditional stat chips.

The Weapon, Vitality, and Spirit catalogs expand to their full content height at every screen size. Scroll the document to browse tiers; the shop content is not an independent scroll region.

Item previews: shop and draft tiles reveal category-colored stat/effect tooltips on mouse hover or keyboard focus. The tooltip renders outside scrolling containers, stays within the viewport, remains hoverable for reading, and dismisses on Escape, scrolling, dragging or clicking. Touch retains the info-button details flow.

Hover previews use original per-category game backings as their alpha silhouettes and backgrounds, plus the original category header artwork. The layout uses ivory Occult titles, mint soul prices in Pulp, compact innate stat lines, dark Passive/Active bars with cooldowns, large numeric effect blocks, secondary parameters, and component/upgrade rows. All tooltip artwork and fonts remain local.

## Direction contract
THESIS: Reproduce the established Deadlock shop language for private local build drafting. The user's reference is the game's shop, not a new brand or marketing page.

OWN-WORLD: Dark olive panels; warm ivory labels; orange Weapon, green Vitality, lavender Spirit. Bundled game item artwork and Retail / Valve Occult typefaces. Dense cream item tiles grouped by soul tier.

STORY: Name a draft, select a category, add shop items, organize alternatives, equip a separate loadout, inspect its investment bonuses, and return to locally saved drafts.

FIRST VIEWPORT: A game-style tab row switches between a full-width build editor, each of the three item catalogs, and a dedicated loadout/stats page. No catalog or investment bars crowd the build. The shop has a destination-category selector and return-to-build action. The stats page places inventory and investments above three colored stat columns, with small item icons marking conditional contributions and full item effects below.

FORM: Established in-game visual world explicitly pinned by the user. The user reiterated close game fidelity. Preserve game typography, dense illustrated cream tiles, olive panels, and orange/green/purple category colors. Click to add; click draft item to equip; drag within the editor to move and order. Stat totals expand to show contributing items; conditional icon chips open the originating item details. Motion only for the item detail panel, with reduced motion support.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
