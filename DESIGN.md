---
name: The Curiosity Shop
description: Deadlock's in-game shop language for local build drafting.
colors:
  canvas: "#20231d"
  build-surface: "#2d3228"
  shop-surface: "#2d3027"
  category-surface: "#24291f"
  category-selected: "#343e2b"
  toolbar: "#3b4334"
  control: "#373c30"
  control-hover: "#4b5140"
  field: "#272b23"
  cream: "#eee5d2"
  muted: "#aeb1a0"
  line: "#464a3d"
  weapon: "#d9a14c"
  vitality: "#8caf56"
  spirit: "#b49bcc"
  tile: "#e7dbbc"
  tile-ink: "#25271c"
  action-cream: "#e4dac1"
  action-ink: "#2a2e24"
  souls: "#a3dfc3"
  focus: "#f0dfb5"
typography:
  display:
    fontFamily: "Occult, serif"
    fontSize: "30px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Occult, serif"
    fontSize: "24px"
    fontWeight: 600
  title:
    fontFamily: "Occult, serif"
    fontSize: "20px"
    fontWeight: 600
  body:
    fontFamily: "Retail, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Retail, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  item-label:
    fontFamily: "Retail, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "14px"
rounded:
  panel: "4px"
  field-tile: "3px"
  small: "2px"
spacing:
  micro: "4px"
  compact: "8px"
  control: "12px"
  panel: "16px"
  section: "24px"
  page: "32px"
components:
  button:
    backgroundColor: "{colors.control}"
    textColor: "{colors.cream}"
    rounded: "{rounded.panel}"
    padding: "8px 12px"
  button-hover:
    backgroundColor: "{colors.control-hover}"
  button-cream:
    backgroundColor: "{colors.action-cream}"
    textColor: "{colors.action-ink}"
    rounded: "{rounded.panel}"
    padding: "8px 12px"
  field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.cream}"
    rounded: "{rounded.field-tile}"
    padding: "8px 12px"
  category:
    backgroundColor: "{colors.category-surface}"
    rounded: "{rounded.field-tile}"
    padding: "8px"
  category-selected:
    backgroundColor: "{colors.category-selected}"
  item-card:
    backgroundColor: "{colors.tile}"
    textColor: "{colors.tile-ink}"
    typography: "{typography.item-label}"
    rounded: "{rounded.field-tile}"
    height: "111px"
  active-tag:
    backgroundColor: "#424236"
    textColor: "#e8dfca"
    height: "10px"
---

# Design System: The Curiosity Shop

## Overview

**Creative North Star: "The Deadlock Shop"**

This system reproduces the user's established in-game visual reference: dark olive shop panels, warm ivory lettering, and orange Weapon, green Vitality, and lavender Spirit categories. It is a dense working catalog with editable build categories, rather than a new visual identity. Bundled Retail and Valve Occult fonts and original game artwork carry the visual authority.

Compact controls, cream item labels, soul-tier separators, and restrained borders keep a large number of items readable at once. Category color carries through tabs, artwork grounds, details, and investment bars. The layout preserves the separate roles of draft organization and equipped inventory.

**Key Characteristics:**
- Dense olive surfaces with warm ivory text.
- Persistent Weapon, Vitality, and Spirit color identities.
- Occult headings paired with compact Retail interface text.
- Small corner radii, thin borders, and independently scrolling work areas.
- Game artwork with documented local provenance.

## Colors

The palette combines subdued olive neutrals with warm paper item tiles and three functional category accents. The frontmatter is the normative source for primitive values.

### Primary
- **Weapon orange:** Weapon tabs, investment bars, category identity, and item detail headers. Item artwork uses a deeper orange ground.

### Secondary
- **Vitality green:** Vitality tabs, investment bars, category identity, and item detail headers. Its artwork ground and detail surface remain in the same green family.

### Tertiary
- **Spirit lavender:** Spirit tabs, investment bars, category identity, and item detail headers. Its artwork ground and detail surface remain in the same purple family.

### Neutral
- **Canvas and panel olives:** Distinguish the page, build editor, shop, controls, and inset category surfaces without large brightness shifts.
- **Cream and muted ivory:** Main interface text and supporting labels respectively.
- **Paper tile and dark ink:** Item name strips invert the surrounding dark interface for fast catalog scanning.
- **Action cream:** Highlights the New build and Equip item actions.
- **Soul mint:** Prices and the equipped total; category investment text retains its category accent.
- **Focus ivory:** Visible keyboard outlines.

**The Category Identity Rule.** Weapon stays orange, Vitality stays green, and Spirit stays lavender across every component that represents those item types.

## Typography

**Display Font:** Occult, using the bundled Valve Occult SemiBold file, with serif fallback.

**Body Font:** Retail, using bundled regular and bold files, with sans-serif fallback.

**Character:** Occult supplies the recognizable game-shop voice at the wordmark, editable build title, panel headings, and tabs. Retail carries dense names, prices, controls, descriptions, and supporting text.

### Hierarchy
- **Display:** Wordmark; reduces to the headline size at the medium breakpoint and the title size on mobile.
- **Headline:** Editable build name and item detail title. Detail titles use a tight line height (1.1).
- **Title:** Build toolbar and item-type tabs.
- **Body:** General interface and description text; detail descriptions use an expanded line height (1.6).
- **Label:** Compact filters, metadata, supporting labels, and controls.
- **Item label:** Bold, centered, balanced wrapping inside cream name strips.
- **Microcopy:** Observed supporting labels range from 8px active ribbons through 9px investment captions to 10px footers and counters. These sizes are confined to their existing dense metadata roles.

**The Game Font Rule.** Use Occult for the established game headings and Retail for the working interface; load the bundled files so the shop retains its typography offline.

## Layout

The page is desktop first with a centered maximum width (1800px), page gutters (32px), and a compact spacing rhythm built from the frontmatter scale. The primary workspace pairs the build editor on the left with a wider shop on the right: `minmax(340px, .82fr) minmax(530px, 1.45fr)` with a section gap. Workspace height follows the viewport (`calc(100dvh - 340px)`), bounded between 460px and 900px. Category contents and the item catalog scroll inside their panels while toolbars and panel footers remain visible.

Categories use two columns and may span both. Category item grids auto-fill from a 72px minimum; their cards stop at 104px. The shop auto-fills from an 82px minimum with compact gaps. Tier headers separate groups with a soul price, thin horizontal rule, and tier label. The equipped loadout spans below the workspace, pairing inventory with three investment rows. Inventory has twelve columns on wide screens.

At 1150px and below, page gutters reduce to 24px, the workspace grid becomes `minmax(300px, .8fr) minmax(420px, 1.2fr)`, the shop minimum tile width becomes 74px, and inventory uses six columns. At 800px and below, gutters become 16px, the workspace and loadout become single-column, build height is bounded between 360px and 600px, and the shop is 660px tall. Inventory returns to twelve compact columns. Secondary header labels and tab counts disappear to preserve the controls. At 1600px and above, shop tiles have a 96px minimum, their total height becomes 120px, and artwork grows with them.

## Elevation & Depth

Depth comes primarily from olive tonal layering, fine borders, and paper item tiles. Tiles carry a small shadow; floating inspection, draft-library, threshold, toast, and confirmation surfaces use stronger occlusion and shadows. The detail panel remains fixed to the right and receives the selected type's accent border and header.

### Shadow Vocabulary
- **Item tile:** `0 3px 6px #0003`; a small lift above the catalog.
- **Threshold popover:** `0 8px 32px #0008`; local investment explanation.
- **Draft library:** `0 16px 40px #0008`; floating draft selection.
- **Item detail:** `0 16px 60px #000b`; the foremost inspection surface.
- **Toast:** `0 8px 32px #0006`; transient status feedback.

## Shapes

Panels and ordinary buttons use restrained panel corners; fields, categories, inventory slots, and item tiles use the slightly tighter field/tile corners. Small counters and annotations use the smallest radius. Thin borders establish structure. Empty category targets and locked slots use dashed borders.

Active items have a distinct rounded upper silhouette (12px upper corners, 4px lower corners) and a narrow ACTIVE ribbon. Equipped items receive an ivory outline and circular check marker. Selected categories use a pale border plus an inset ring, keeping category selection distinct from item equipment.

## Components

### Buttons

Compact, solid, and tactile. Ordinary buttons use olive surfaces with a thin border and bold Retail text; cream buttons identify the prominent create/equip actions. Icon controls are smaller, transparent, and square. Hover brightens the fill; pressing moves buttons down by 1px. Disabled controls reduce opacity to .35 and suppress the press movement. Keyboard focus uses a 2px ivory outline with a 3px offset.

### Cards / Containers

Build and shop containers use different olive surfaces with thin borders. Editable category cards support half- or full-width layout, a selected state, compact text fields, item grids, and dashed empty targets. Item cards combine a category-colored artwork ground, bundled item image, and cream name strip. The information control remains in the top right; category remove controls appear on hover or keyboard focus within the card. Equipped and added-to-category marks remain separate states.

### Inputs / Fields

Fields have dark olive fills, thin olive borders, compact padding, and muted placeholder text. The build name uses Occult and a recessed surface; category names and notes are initially transparent, gaining a visible fill and border on focus. Search is an icon-and-input group with a dark inset surface. Checkbox accents are warm ivory. All field types retain the shared keyboard focus outline.

### Navigation

Three equally weighted tabs identify item types. Inactive tabs retain a colored top rule and muted opacity (.7); hover restores opacity. The chosen tab uses the full type accent with dark ink. Occult titles and inline geometric SVG icons make the types scannable; supporting counts use Retail and disappear on mobile.

### Tags

The ACTIVE tag is a narrow dark ribbon anchored to the item card's lower edge, using tightly spaced uppercase microcopy. It identifies an item property rather than an interactive filter chip. Small category and equipped check markers communicate independent states.

### Investment Bars

Three rows repeat the item-type identity with an icon, bonus, soul total, threshold ticks, and a narrow 7px progress track. Filling uses a left-origin horizontal scale. Each summary opens a local threshold popover. Numeric totals use tabular figures, keeping changing totals aligned.

### Item Details and Feedback

The fixed detail panel is 360px wide, constrained to the viewport. Its accent header contains game artwork and an Occult title; the body scrolls separately from the bottom actions. It arrives over .2s with the shared `cubic-bezier(.22,1,.36,1)` easing, fading in and translating 12px horizontally. Ordinary button color and opacity transitions use the same duration and easing. Reduced-motion preference removes animations and transitions. Confirmation uses a dark scrim; status uses a cream toast.

## Do's and Don'ts

### Ability point order

The navigation tab is Abilities, placed after Vitality. Its ability reference follows the map: olive headers with ability icons, baseline description and stat columns, and three upgrade rows with AP costs. Applied preview tiers use the existing selected olive and vitality border. The details stack on narrow screens. Preview rank controls and equipped imbue assignments live here; calculated loadout abilities stay on Loadout & stats.

The build editor follows CitadelAbilityOrder's cream icon rail, four alternating dark rows, purple unlock arrows, and muted upgrade arrows with point costs. Sixteen numbered columns show the plan, with the next column highlighted in olive. On narrow screens the grid scrolls horizontally with sticky ability icons. Undo step and Reset order use small toolbar controls. Visual source: https://github.com/SteamDatabase/GameTracking-Deadlock/blob/master/game/citadel/pak01_dir/panorama/styles/citadel_ui_ability_order.css

### Do:
- **Do** preserve the Weapon, Vitality, and Spirit category identities across tabs, artwork, details, and investment.
- **Do** retain the bundled Retail and Occult fonts and documented game assets for offline rendering.
- **Do** keep category selection, draft membership, and equipped state visually distinct.
- **Do** preserve visible keyboard focus and the reduced-motion behavior.
- **Do** keep image provenance in ASSETS.md and per-item source and iconSource records in data/items.json.

### Don't:
- **Don't** replace the user-pinned game-shop world with a new marketing or product identity.
- **Don't** use the category accents interchangeably or treat every draft item as equipped.
- **Don't** remove item names, type labels, or check marks and rely on color alone.
- **Don't** promote compact footer and ribbon microcopy into the default size for new body content.
