---
name: git-commit-messages
description: >-
  Drafts git commit messages in this repo’s format (type/scope subject, Chris
  Beams rules, 72-char body wrap). Use when the user asks for a commit message,
  wants to commit, amend, or polish messages, or when preparing `git commit`
  after staged changes.
---

# Git commit messages (Politics of Today)

Follow these rules for every commit message you propose or write. Extended
examples and resource links live in [docs/commit_msg.md](../../../docs/commit_msg.md).

## Before writing

1. Inspect the actual change (`git diff`, `git status`) so the message matches
   what shipped—not the user’s guess.
2. Prefer **one logical change** per commit; if the diff mixes concerns,
   suggest splitting or reflect the dominant change in the subject.

## Format (required shape)

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **Subject line alone is valid** when the change is trivial; add a body when
  context or motivation helps reviewers.

## Subject line

| Rule | Detail |
|------|--------|
| Length | **≤ 50 characters** (count the full subject including type/scope) |
| Style | **Imperative**: “Add”, “Fix”, “Refactor”—not “Added” or “Adds” |
| Case | Capitalize the first word after the colon |
| Period | **No** trailing period on the subject |
| Scope | Recommended: area touched (`app`, `api`, `prisma`, `party`, `auth`, etc.) |

### Types (pick one)

`feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `chore`

## Body (optional)

- **Blank line** between subject and body.
- Wrap at **~72 characters** per line.
- Explain **what** and **why**, not line-by-line **how** unless necessary for
  safety or non-obvious behavior.

## Footer (optional)

- Issues: `Fixes #123`, `Closes #456`
- Breaking changes: `BREAKING CHANGE: <description>`

## Chris Beams checklist (quick)

1. Separate subject from body with a blank line  
2. Subject ≤ 50 characters  
3. Capitalize the subject  
4. No period at end of subject  
5. Imperative mood  
6. Body wrapped at ~72 characters  
7. Body explains what and why  

## Good vs bad (subjects)

- ✅ `fix(auth): Align session cookie with API responses`
- ❌ `fixed login` (past tense, no type, vague)
- ❌ `feat: Added new party draft voting panel` (past tense, subject too long)

## When executing git

- Do not commit secrets (honor `.gitignore`; never stage `.env*`).
- If the environment injects unwanted footers into commits, use
  `git -c core.hooksPath=/nohooks commit ...` only when the user explicitly
  wants a clean message and understands the tradeoff.
