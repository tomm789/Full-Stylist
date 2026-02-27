# Keyboard Functionality Fix Plan

## Purpose
This README is a handoff plan to fully fix mobile keyboard behavior across the app.

Primary user-facing failures to resolve:
- Keyboard opens over inputs and hides what the user is typing.
- Submit/action controls can remain blocked by keyboard.
- In draw mode, keyboard can become non-dismissible because canvas gestures capture touches.

## Current Status (Handoff Snapshot)
- A broad patch pass was already applied across many files (`keyboardShouldPersistTaps`, `keyboardDismissMode`, extra `KeyboardAvoidingView`, some `blurOnSubmit`).
- This improved keyboard dismissal in some places, but did **not** fully solve:
  - reliable input visibility while typing,
  - consistent control positioning above keyboard,
  - draw mode keyboard dismissal while canvas is active.
- The current fix strategy should shift from ad hoc per-screen patches to a shared keyboard foundation with targeted integration.

## Non-Goals
- Do not redesign UI visual style.
- Do not refactor unrelated feature logic.
- Do not fix unrelated TypeScript issues currently present in the repo.

## Implementation Strategy
Implement in strict order:

1. Foundation primitives
2. Draw mode integration (highest-risk interaction)
3. Shared screen/modal integration
4. App-wide adoption
5. QA + regression hardening

---

## Phase 1: Foundation Primitives

### 1.1 Add a shared keyboard inset hook
Create:
- `src/hooks/ui/useKeyboardInsets.ts`

Responsibilities:
- Track keyboard visibility + height with listeners.
- Normalize platform differences (`keyboardWillShow/Hide` iOS, `keyboardDidShow/Hide` Android fallback).
- Expose:
  - `keyboardVisible`
  - `keyboardHeight`
  - `bottomInset` (keyboard + safe-area aware)

### 1.2 Add a keyboard-aware layout wrapper
Create:
- `src/components/shared/layout/KeyboardAwareScreen.tsx`
- Export from `src/components/shared/layout/index.ts`

Responsibilities:
- Combine:
  - `KeyboardAvoidingView`
  - `ScrollView`/content container defaults
  - global tap-to-dismiss surface (`Pressable` + `Keyboard.dismiss`)
  - configurable bottom spacer tied to `useKeyboardInsets`
- Standard defaults:
  - `keyboardShouldPersistTaps="handled"`
  - `keyboardDismissMode="on-drag"`
- Support options:
  - fixed bottom action bars
  - modal/sheet mode
  - custom keyboard vertical offset

### 1.3 Add shared constants
Create:
- `src/constants/keyboard.ts`

Include:
- iOS/Android baseline offsets
- draw mode special offsets
- fallback spacer values

---

## Phase 2: Draw Mode (Critical)

### Target files
- `src/hooks/headshot/useDrawModeLogic.ts`
- `src/components/headshots/DrawModeInline.tsx`
- `src/components/headshots/DrawModeModal.tsx`
- `src/components/headshots/ColorControlsPanel.tsx`
- `src/components/shared/CreatorBar.tsx`
- `src/components/headshots/HeadshotCreatorContainer.tsx`

### Required behavior
1. When a draw-mode prompt `TextInput` is focused:
- Keyboard opens.
- Prompt field remains visible (not obscured).
- Generate bar and creator container reposition above keyboard.

2. Tap outside input while keyboard open:
- Dismiss keyboard reliably.
- Must work even when canvas is visible.

3. Canvas gesture interaction during keyboard-open:
- Prevent gesture capture from blocking dismissal taps.
- Strategy: gate draw gesture when keyboard is visible and no active stroke is in progress.
- Keep pan/zoom behavior explicit and safe (or temporarily disabled while typing).

### Implementation notes
- Add `keyboardVisible` awareness to draw logic.
- Add non-canvas dismissal zone in draw mode layout.
- Ensure `ColorControlsPanel` scrolls focused input into visible area when keyboard appears.
- Move fixed bottom controls with animated bottom offset from keyboard inset.

---

## Phase 3: Modal and Form Standardization

Adopt `KeyboardAwareScreen` (or equivalent shared wrapper) across input-heavy surfaces:

- `app/auth/login.tsx`
- `app/auth/signup.tsx`
- `app/feedback/new.tsx`
- `app/feedback/[id].tsx`
- `app/calendar/entry/[date].tsx`
- `app/listings/new.tsx`
- `app/lookbooks/new.tsx`
- `app/search.tsx`
- `app/account-settings.tsx`
- `app/profile-images.tsx`
- `app/ai-settings.tsx`
- `app/wardrobe/item/[id]/edit.tsx`
- `src/components/calendar/CalendarDayEntryForm.tsx`
- `src/components/calendar/CreatePresetModal.tsx`
- `src/components/lookbooks/LookbookPickerModal.tsx`
- `src/components/lookbooks/EditLookbookModal.tsx`
- `src/components/social/CommentsModal.tsx`
- `src/components/profile/EditProfileModal.tsx`
- `src/components/profile/DeleteAccountModal.tsx`
- `src/components/headshots/ShareToFeedModal.tsx`

Focus:
- remove layout inconsistency,
- ensure consistent keyboard offset + dismiss interactions,
- avoid duplicate local keyboard logic unless necessary.

---

## Phase 4: Input Semantics Cleanup

Audit all `TextInput` usage and apply consistent intent:
- Single-line fields: `blurOnSubmit`
- Multi-line comment/composer fields: explicit `blurOnSubmit={false}` (where desired)
- Confirm `returnKeyType` choices and submit handlers are coherent

Likely related files:
- `src/components/shared/forms/Input.tsx`
- `src/components/shared/layout/SearchBar.tsx`
- `src/components/tabs/HeaderSearchPill.tsx`
- `src/components/feedback/CommentInput.tsx`
- `src/components/outfits/CommentSection.tsx`
- `src/components/headshots/AdvancedFieldsPanel.tsx`

---

## QA Matrix (Required Before Merge)

### Devices
- iOS: small + large screen
- Android: small + large screen

### Orientation
- Portrait required
- Landscape sanity check on key screens

### Must-pass scenarios
1. Focus field near bottom of viewport:
- typed text stays visible above keyboard

2. Keyboard open + tap outside:
- keyboard dismisses without losing typed value

3. Keyboard open + submit button:
- submit control remains visible and tappable

4. Modal forms:
- no blocked headers/actions
- close/cancel remains reachable

5. Draw mode:
- focus prompt input
- keyboard shows and prompt remains visible
- tap outside dismisses keyboard even with canvas present
- no accidental drawing while trying to dismiss

---

## Suggested Execution Order for Next Agent
1. Implement `useKeyboardInsets` + `KeyboardAwareScreen`.
2. Integrate draw mode fully (inline + modal) and validate manually first.
3. Migrate auth + feedback + comments + calendar modals.
4. Migrate remaining screens.
5. Run QA matrix and document results.

---

## Verification Commands
- Typecheck (known unrelated failures currently exist):
  - `npm run typecheck`
- If needed for manual device checks:
  - `npm run ios`
  - `npm run android`

Do not block keyboard fix delivery on existing unrelated type errors already present in icon/theme areas.

---

## Definition of Done
Keyboard behavior is considered fixed only when:
- users can always see what they are typing,
- users can always dismiss keyboard without data loss,
- users can always reach submit/primary actions,
- draw mode no longer traps keyboard due to canvas gesture capture.
