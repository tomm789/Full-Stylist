---
name: ""
overview: ""
todos: []
isProject: false
---

# Hair & Make-up Modal: Preset Pills → 4-Column Grid (1:1 Tiles)

## Scope

**Keep as-is**

- Modal top bar: tab row with white pills on black background (Quick, Hair, Make-Up, Accessories, Jewellery, Advanced) — all as simple pills, no expandable behaviour.
- Inside Hair/Make-up modals: category switcher row (e.g. Quick + Long Hairstyles, Medium, etc.) stays horizontal.
- Custom text fields and the hair length slider.
- Advanced tab: text inputs only (no preset grid needed unless you add presets later).

**Change 1: Accessories & Jewellery subcategories — move into modal, match Hair/Make-up styling**

- **Current:** Accessories and Jewellery show their subcategories in an **expanded pill** in the main tab row (the row with Quick, Hair, Make-up, etc.). When you tap Accessories, that pill expands to show Hair Accessories, Hats & Caps, Sunglasses, Scarves; Jewellery expands to show Earrings, Necklaces.
- **New:** Nothing is removed from the modals. The subcategory options (Accessories: Hair Accessories, Hats & Caps, Sunglasses, Scarves; Jewellery: Earrings, Necklaces) are **moved** from the main tab row into the **top of the modal content**.
- So: main tab row has **no** expanded pill for Accessories or Jewellery — they are simple pills like Quick, Hair, Make-up. When you tap Accessories (or Jewellery), the modal opens and the **first row inside the modal** is the subcategory pills, styled the same as the category row on Hair and Make-up modals (e.g. the row with Quick, Long Hairstyles, etc.). Subcategories stay inside the modal only; they are not shown outside the modal.

**Implementation note (Change 1):** Main tab row: render Accessories and Jewellery as plain `PillButton`s (no expand, no nested subcategory pills). In the Accessories modal, the first content row is the subcategory pills (Hair Accessories, Hats & Caps, Sunglasses, Scarves) using the same container/style as the category pill row in Hair/Make-up modals (e.g. `categoryPills` / `categoryPillsRow`). Same for Jewellery modal (Earrings, Necklaces). Nothing is removed from the modals — subcategories are only moved from the main row into this top row of the modal.

**Change 2: Preset selection pills → 4-column grid**

- Preset selection pills (the tappable options for makeup, hair styles, hair color, etc.) that currently use a wrapped row of pills.
- Layout: **4-column grid**.
- Each cell: **1:1 aspect ratio** (square tile).

---

## Plan

### 1. Identify preset pill containers

- In the edit modal content, locate every place that renders preset options as pills:
  - Quick tab: makeup preset pills (e.g. Natural, Glam, …).
  - Quick tab: hair length is a slider → leave as-is.
  - Hair/Make-up (custom): hair length slider; preset pills for makeup or hair; custom description input; hair color swatch pills.
  - Category-based sections: section options rendered as pills (same pill style).
- All of these “option” pill rows should switch from a **flexWrap row** (e.g. `pillRow`) to a **4-column grid**.

### 2. Grid layout

- Replace the current row layout with a grid:
  - Container: `flexDirection: 'row'`, `flexWrap: 'wrap'`, and horizontal spacing (e.g. gap or margin) so exactly **4 items per row**.
  - Each child width: `~25%` (or `width: '25%'` with box model that accounts for gap), so four tiles per row.
  - Each tile: `aspectRatio: 1` so they are **1:1 (square)**.
- Use a single shared style (e.g. `presetGrid`, `presetGridItem`) so all preset sections use the same grid.

### 3. Tile styling

- Each tile remains tappable (TouchableOpacity or Pressable).
- Content inside the square: center icon (if any), label (wrap or truncate to fit), and optional info icon. Ensure label doesn’t overflow (numberOfLines + ellipsizeMode or smaller font if needed).
- Selected state: keep current selected styling (e.g. primary background/border), applied to the whole tile.
- **Hair color tiles**: keep swatch styling (solid or dual-tone) but within the same 1:1 grid cell; ensure text and swatch fit and stay readable.

### 4. Section structure

- Each section (e.g. “Hair Length”, “Makeup”, “Hair Color”) keeps its section label.
- Below the label: **either** the existing slider (hair length) **or** the new 4-column grid of preset tiles, not both in one section unless you want slider above grid.
- No change to section order or to non-preset UI (inputs, sliders).

### 5. Edge cases

- **Fewer than 4 items**: row still has 4 columns; remaining cells are empty (or allow last row to have 2–3 items).
- **Many items** (e.g. hair colors): grid scrolls with the modal’s ScrollView; no need for a separate FlatList unless you hit performance issues.
- **Accessories/Jewellery**: after moving subcategories to the top row of the modal, any future preset options in those tabs use the same 4-column grid style when added.

---

## Summary


| Item                                | Current                                                    | New                                                                                      |
| ----------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Main tab row (Quick, Hair, …)       | Accessories/Jewellery expand in-pill to show subcategories | All pills simple; no expand. Accessories/Jewellery open modal only.                      |
| Accessories/Jewellery subcategories | Shown in expanded pill on main row (and/or in modal)       | Shown **only** as first row **inside** the modal, styled like Hair/Make-up category row. |
| Preset option pills                 | Horizontal wrapped row                                     | **4-column grid**, each tile **1:1 (square)**.                                           |
| Tap / selected behaviour            | —                                                          | Unchanged.                                                                               |


