---
allowed-tools: Bash(codex exec:*), Bash(git diff:*), Bash(git status:*), Bash(git log:*)
description: Ask Codex to review code in read-only mode. Pass what to review as the argument. Claude Code will invoke Codex for analysis, then synthesize both perspectives.
---

## Review Workflow

You are asking Codex to review the following:

**Review target:** $ARGUMENTS

### Step 1: Invoke Codex for Review
Run Codex in read-only mode:
```bash
codex exec --sandbox read-only --ephemeral "Review the following and provide detailed feedback: $ARGUMENTS. Focus on: correctness, TypeScript type safety, React Native best practices, and potential runtime errors."
```

### Step 2: Synthesize
After Codex returns its review:
1. Read Codex's findings
2. Add your own architectural perspective
3. Present a combined review to the user with:
   - Critical issues (must fix)
   - Recommendations (should fix)
   - Observations (nice to have)
4. If there are fixes to make, ask the user if they'd like you to `/delegate` the fixes to Codex
