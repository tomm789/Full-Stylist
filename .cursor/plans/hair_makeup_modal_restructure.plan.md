---
name: ""
overview: ""
todos: []
isProject: false
---

# Hair & Make-up: Nested Tabs → Modal per Tab

## Goal

On the hair & make-up page, "my mirror" tab:

1. Move the nested tab header row (Quick, Hair, Makeup, Accessories, Jewellery, Advanced) to sit **below the page header** and **above the image slider**.
2. Each tab label pill opens a **modal** that shows that tab’s content (presets / custom values).
3. Behaviour unchanged: selections still surface in the bar above the bottom navigation and are used for generation.
4. Final layout: **Page header → Tab pills row → Image slider → Prompt details** (existing behaviour preserved).

---

## Plan (minimal code analysis)

### 1. Identify current structure

- Locate the hair & make-up / mirror screen and its layout (header, image slider, nested tabs).
- Find where the nested tab content is rendered (Quick, Hair, Makeup, etc.) and what components/data they use.
- Find where the “selection bar” above the bottom nav is fed from (so we don’t break it).

### 2. Extract tab content into modal-ready components

- For each nested tab (Quick, Hair, Makeup, Accessories, Jewellery, Advanced), ensure its content is in a component (or clearly delineated) so it can be rendered inside a modal.
- Reuse existing state/callbacks so the same presets and custom values still update the selection bar and generation.

### 3. Add a single modal component

- Create one modal component that:
  - Accepts `visible`, `onClose`, and `title` (or tab id).
  - Renders **one** tab’s content at a time (the one corresponding to the clicked pill).
- Use existing design system (e.g. `FullScreenMenuModal` or similar) for consistency if appropriate.

### 4. Reorder layout on the mirror tab

- In the mirror tab’s JSX/layout:
  - Keep: page header as-is.
  - Add: the tab pills row directly under the page header (same pills, no inline content below them).
  - Keep: image slider below the pills.
  - Keep: prompt details below the image slider.
- Remove (or hide): the current inline area where nested tab content was shown below the slider.

### 5. Wire pills to modals

- Map each pill to a tab id (Quick, Hair, Makeup, etc.).
- On pill press: set “active modal tab” (or “open modal with tab X”) and open the modal with that tab’s content.
- On modal close: clear “active modal tab” / close modal.
- Ensure only one modal is open at a time and the correct content is shown.

### 6. Preserve selection bar and generation

- Confirm the selection bar above the bottom nav still reads from the same state/source as before.
- Confirm generation still uses the same prompt/settings; no changes to generation logic, only where the UI for editing those settings is shown (in modals instead of inline).

### 7. Quick sanity check

- Run the app, open “my mirror”, click each pill and confirm each modal opens with the right content.
- Change presets/custom values in a modal and confirm they appear in the bar and in the prompt/generation as before.

---

## Summary


| Before                          | After                                      |
| ------------------------------- | ------------------------------------------ |
| Header → Slider → Nested tabs   | Header → **Tab pills** → Slider → Prompt   |
| Tab content inline below slider | Tab content in **modal** on pill click     |
| Selection bar + generation      | Unchanged (same state, same bar, same use) |


No new behaviour; only layout change (pills up, content in modals) and one new modal component (or reuse of an existing modal pattern).