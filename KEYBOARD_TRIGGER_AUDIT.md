# Keyboard Trigger Audit

Generated from minimal grep scan on app + src.

## 1) Direct keyboard triggers (`<TextInput ...>`)

```text
app/listings/new.tsx:159:            <TextInput
app/search.tsx:72:        <TextInput
app/headshot/[id].tsx:232:            <TextInput
app/headshot/[id].tsx:245:            <TextInput
app/headshot/new.tsx:145:                <TextInput
app/headshot/new.tsx:158:                <TextInput
app/lookbooks/new.tsx:86:        <TextInput
app/lookbooks/new.tsx:95:        <TextInput
app/auth/signup.tsx:139:          <TextInput
app/auth/signup.tsx:150:          <TextInput
app/auth/signup.tsx:160:          <TextInput
app/feedback/new.tsx:140:          <TextInput
app/feedback/new.tsx:154:          <TextInput
app/calendar/entry/[date].tsx:214:          <TextInput
app/auth/login.tsx:93:          <TextInput
app/auth/login.tsx:105:            <TextInput
app/(tabs)/_layout.tsx:256:            <TextInput
src/components/headshots/ColorControlsPanel.tsx:102:                <TextInput
src/components/wardrobe/EditItemForm.tsx:34:        <TextInput
src/components/wardrobe/EditItemForm.tsx:45:        <TextInput
src/components/wardrobe/EditItemForm.tsx:58:        <TextInput
src/components/wardrobe/EditItemForm.tsx:69:        <TextInput
src/components/tabs/HeaderSearchPill.tsx:141:          <TextInput
src/components/tabs/FullScreenMenuModal.tsx:254:            <TextInput
src/components/wardrobe/AddAttributeModal.tsx:64:      <TextInput
src/components/headshots/MirrorTabContent.tsx:279:                        <TextInput
src/components/headshots/MirrorTabContent.tsx:290:                        <TextInput
src/components/headshots/ShareToFeedModal.tsx:61:          <TextInput
src/components/headshots/EditTabModal.tsx:289:                      <TextInput
src/components/feedback/CommentInput.tsx:31:      <TextInput
src/components/headshot/PresetEditor.tsx:153:        <TextInput
src/components/headshots/AdvancedFieldsPanel.tsx:24:          <TextInput
src/components/wardrobe/AttributeEditor.tsx:108:                    <TextInput
src/components/lookbooks/LookbookPickerModal.tsx:87:            <TextInput
src/components/lookbooks/LookbookPickerModal.tsx:95:            <TextInput
src/components/lookbooks/EditLookbookModal.tsx:101:            <TextInput
src/components/lookbooks/EditLookbookModal.tsx:113:            <TextInput
src/components/calendar/CalendarDayEntryForm.tsx:113:    <TextInput
src/components/ai/AIGenerationFeedback.tsx:190:            <TextInput
src/components/shared/forms/Input.tsx:64:      <TextInput
src/components/shared/layout/SearchBar.tsx:49:      <TextInput
src/components/profile/EditProfileModal.tsx:119:            <TextInput
src/components/profile/EditProfileModal.tsx:133:            <TextInput
src/components/profile/AIModelSection.tsx:109:            <TextInput
src/components/profile/AIModelSection.tsx:189:            <TextInput
src/components/social/CommentsModal.tsx:102:          <TextInput
src/components/profile/OnboardingAccountStep.tsx:79:              <TextInput
src/components/profile/OnboardingAccountStep.tsx:105:              <TextInput
src/components/profile/DeleteAccountModal.tsx:110:            <TextInput
src/components/profile/HeadshotSection.tsx:64:        <TextInput
src/components/profile/HeadshotSection.tsx:76:        <TextInput
src/components/outfits/CommentSection.tsx:51:        <TextInput
```

## 2) Programmatic focus triggers (`.focus()`)

```text
app/(tabs)/_layout.tsx:55:        tabSearchInputRef.current?.focus();
src/components/headshots/ColorControlsPanel.tsx:52:    inputRefs.current[focusPromptHex]?.focus();
src/components/tabs/HeaderSearchPill.tsx:80:        inputRef.current?.focus();
```

## 3) Autofocus triggers (`autoFocus`)

```text
app/search.tsx:79:          autoFocus
```

## 4) Indirect triggers via shared `Input` wrapper (`<Input ...>`)

```text
app/outfits/[id].tsx:140:        <Input
app/outfits/[id]/bundles.tsx:232:          <Input
src/components/calendar/CreatePresetModal.tsx:50:            <Input
src/components/shared/forms/TextArea.tsx:25:    <Input
```

## 5) Existing keyboard management hooks

### `KeyboardAvoidingView`

```text
app/auth/login.tsx:149:    </KeyboardAvoidingView>
app/auth/login.tsx:84:    <KeyboardAvoidingView
app/auth/login.tsx:9:  KeyboardAvoidingView,
app/auth/signup.tsx:130:    <KeyboardAvoidingView
app/auth/signup.tsx:190:    </KeyboardAvoidingView>
app/auth/signup.tsx:9:  KeyboardAvoidingView,
app/feedback/[id].tsx:11:  KeyboardAvoidingView,
app/feedback/[id].tsx:75:      <KeyboardAvoidingView
app/feedback/[id].tsx:96:      </KeyboardAvoidingView>
src/components/ai/AIGenerationFeedback.tsx:154:        <KeyboardAvoidingView
src/components/ai/AIGenerationFeedback.tsx:16:  KeyboardAvoidingView,
src/components/ai/AIGenerationFeedback.tsx:217:        </KeyboardAvoidingView>
```

### Dismiss/persist tap handling

```text
src/components/headshots/ColorControlsPanel.tsx:96:          keyboardShouldPersistTaps="handled"
src/components/headshots/EditTabModal.tsx:159:            keyboardShouldPersistTaps="handled"
```
