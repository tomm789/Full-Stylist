---
allowed-tools: Bash(codex exec:*), Bash(git checkout:*), Bash(git branch:*), Bash(git diff:*), Bash(git status:*), Bash(git add:*), Bash(git log:*)
description: Delegate an implementation task to Codex. Pass the task description as the argument. Claude Code will create a branch, invoke Codex non-interactively, and review the results.
---

## Delegation Workflow

You are delegating the following task to Codex (OpenAI's coding agent):

**Task:** $ARGUMENTS

### Step 1: Prepare
- Check current git status with `git status`
- If on `main`, create a feature branch: `git checkout -b feature/<short-descriptive-name>`
- If already on a feature branch, stay on it

### Step 2: Write the Task Spec
Based on the user's request, formulate a precise task specification for Codex. Include:
- Specific files to modify or create
- Expected behavior and acceptance criteria
- Existing patterns to follow (reference specific files)
- Explicit constraints (what NOT to do)

### Step 3: Invoke Codex
Run Codex in non-interactive mode:
```bash
codex exec --full-auto --sandbox workspace-write "<your detailed task spec>"
```

Wait for Codex to complete. The output will stream to stderr with the final message on stdout.

### Step 4: Review
After Codex completes:
1. Run `git diff` to see all changes
2. Review each changed file for correctness
3. Check for:
   - Type errors or missing imports
   - Prop interface mismatches (especially around profile components)
   - Unnecessary changes outside of scope
   - Missing error handling

### Step 5: Report
Present a summary to the user:
- What Codex implemented
- Your review assessment (approve / needs fixes)
- Any issues found and whether you've fixed them
- The branch name and a summary of changes

If fixes are needed and they're small (< 10 lines), fix them directly.
If fixes are substantial, run `codex exec resume --last "<fix instructions>"` to have Codex address them.
