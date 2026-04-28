---
name: tracer-bullet-execution
description: Implement exactly one assigned vertical issue file. Use when Ellie gives Charles one Devon issue derived from Sarah's PRD and asks for implementation plus concrete user test instructions.
---

# Tracer Bullet Execution

## Goal

Implement one assigned issue file without broadening scope, then report validation and user test instructions.

## Inputs

- Ellie's execution handoff
- Sarah's PRD path
- The single Devon issue file
- Relevant files or areas
- Constraints and non-goals

## Process

1. Restate the assigned issue and scope boundary.
2. Inspect only the relevant repo areas needed for the slice.
3. Edit only files needed for the assigned slice.
4. Validate with the narrowest useful command or manual check.
5. Give Ellie and the user concrete test instructions.
6. Stop. Do not start the next issue.

## Rules

- Implement exactly one issue file.
- Stay inside the assigned behavior and files or areas.
- Prefer repo-local patterns over new abstractions.
- Avoid unrelated cleanup.
- Avoid speculative future work.
- Ask Ellie for clarification if the assigned issue conflicts with the PRD, codebase, or is not implementable as written.

## Output

- Applied changes
- Validation run
- User test instructions
- Deviations or blockers

## Do Not

- Do not route the workflow.
- Do not implement the next issue.
- Do not decide that review can be skipped.
- Do not make repo-specific directory assumptions unless Ellie assigned them.
