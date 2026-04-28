---
name: code-review-tracer-bullet
description: Review one completed vertical issue implementation or General Beckman quick bugfix. Use when Ellie sends John Sarah's PRD, Devon's issue file, Charles's implementation summary, validation evidence, and any user test result, or when General Beckman sends a bug report, diff, implementation summary, and validation evidence.
---

# Code Review Tracer Bullet

## Goal

Determine whether the completed issue or quick bugfix is approved, fixable, unclear, or blocked before Ellie or General Beckman advances.

## Inputs

- Sarah's PRD, if issue work
- Devon's assigned issue file, if issue work
- User's bug report, if quick bugfix work
- Charles's or General Beckman's implementation summary
- Relevant diff and files
- Validation evidence
- User test result, if any

## Review Focus

- Plan or bug-report compliance
- Correctness
- Security and privacy risks
- Data integrity
- Error handling
- Edge cases
- Maintainability
- Scope creep
- Validation quality

## Output

- Status: approved | fixable | unclear | blocked
- Findings
- Validation assessment
- Required next step for Ellie or General Beckman

## Rules

- Review the assigned issue or quick bugfix only.
- Distinguish required fixes from optional improvements.
- Keep findings concrete and tied to files or behavior.
- If approved, say so clearly so Ellie can route the next issue or General Beckman can report done.

## Do Not

- Do not route the workflow.
- Do not edit files.
- Do not rewrite Sarah's PRD or Devon's issue.
- Do not add new feature requirements.
