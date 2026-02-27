# Keyboard Fix Progress Tracker

## Goal
Ensure keyboard interactions are reliable across forms and draw mode:
- focused text field/caret visible above keyboard
- primary actions visible/tappable
- keyboard always dismissible by intended UI interactions
- no gesture surface traps keyboard

## Phase Plan

### Phase A: Shared Keyboard Engine (IN PROGRESS)
- [x] Add shared keyboard insets hook (`useKeyboardInsets`)
- [x] Add shared wrapper (`KeyboardAwareScreen`)
- [x] Add focused-input auto-scroll behavior in shared wrapper
- [ ] Validate on standard form screens (auth/feedback/calendar)

### Phase B: Draw Mode Critical Path (IN PROGRESS)
- [x] Gate canvas gestures when keyboard is open
- [x] Add explicit dismiss zone outside input area
- [x] Ensure focused draw prompt stays visible above keyboard via overlap-based scrolling
- [x] Ensure creator/generate controls always remain above keyboard

### Phase C: Modal/Form Consistency
- [x] Migrate listed modal/form screens to shared wrapper
- [ ] Remove incorrect local keyboard behavior where it conflicts with shared behavior
- [ ] Re-check multiline/single-line submit semantics

### Phase D: QA Matrix (BLOCKER BEFORE DONE)
- [ ] iOS small + large devices
- [ ] Android small + large devices
- [ ] Bottom-field visibility checks
- [ ] Tap-outside dismissal checks
- [ ] Submit-control reachability checks
- [ ] Draw-mode no-trap checks

## Current Risks
- Device validation is still required for edge cases (small screens, landscape, split keyboard).

## Change Log
- 2026-02-27: Tracker created; implementing Phase A auto-scroll and Phase B prompt visibility corrections next.
- 2026-02-27: Implemented overlap-based focused-input auto-scroll in `KeyboardAwareScreen` and overlap-based prompt alignment in `ColorControlsPanel`.
