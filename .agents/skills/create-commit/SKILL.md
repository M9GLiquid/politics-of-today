---
name: create-commit
description: Create a git commit using this repo's commit message guidelines. Use when the user asks to commit changes, make a commit, write a commit message and commit, or invoke the commit skill.
---

# Create Commit

## Goal

Create a clean git commit for the intended change set using
`docs/commit_msg.md` as the message style source of truth.

## Process

1. Read `docs/commit_msg.md`.
2. Inspect `git status --short`.
3. Inspect the relevant diff with `git diff` and, when needed,
   `git diff --staged`.
4. Identify the intended commit scope.
5. If unrelated or ambiguous changes are present, ask the user what to include.
6. Stage only the files that belong in the commit.
7. Write a commit message that follows the repo guidelines.
8. Run `git commit` non-interactively with the prepared message.
9. Report the commit hash, subject, included files, and any excluded changes.

## Message Rules

Follow `docs/commit_msg.md`.

Core rules:

- Format: `<type>(<scope>): <subject>` or `<type>: <subject>`.
- Use one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
  `test`, `chore`.
- Keep the subject near 50 characters when practical.
- Capitalize the subject.
- Use imperative mood.
- Do not end the subject with a period.
- Separate subject and body with a blank line.
- Wrap body lines at 72 characters.
- Explain what changed and why, not low-level how.
- Prefer short user-centric body paragraphs.
- Start body paragraphs with clear action words such as `Added`,
  `Updated`, `Fixed`, `Improved`, or `Removed`.

## Staging Rules

- Never stage unrelated user changes.
- Never revert unrelated changes.
- If files are already staged, inspect them before committing.
- If staged files do not match the intended scope, ask before changing staging.
- Prefer explicit path staging over `git add .`.

## Command Guidance

Use a temporary message file and commit with:

```bash
git commit -F <message-file>
```

Avoid interactive commit editors.

## Output

- Commit hash
- Commit subject
- Files included
- Validation or checks run, if any
- Excluded changes, if any
