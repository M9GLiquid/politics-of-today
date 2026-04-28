---
name: prd-to-issues
description: Convert a PRD Markdown artifact into independently grabbable vertical slice issue files. Use when Sarah has produced a PRD and Ellie needs Devon Woodcomb to surgically break it into ordered tracer-bullet implementation issues.
---

# PRD To Issues

## Goal

Turn Sarah's PRD into a sequence of thin, independently grabbable vertical implementation issues.

Devon Woodcomb is the PRD surgeon: preserve Sarah's product intent, cut along clean implementation boundaries, and avoid horizontal layer tickets.

## Inputs

- Sarah's PRD Markdown file
- Chuck research findings, if any
- Repo context needed to understand likely integration points
- Ellie constraints for issue location or naming

## Artifact

Write or propose Markdown issue files under `docs/issues/` unless Ellie specifies another location.

Use stable filenames such as:

```text
docs/issues/YYYYMMDD-feature-01-short-slice.md
docs/issues/YYYYMMDD-feature-02-short-slice.md
```

## Process

1. Locate and read the PRD.
2. Explore the relevant codebase areas if the slice boundaries depend on existing structure.
3. Draft vertical slices that cut through the required integration layers end to end.
4. Mark each slice as `HITL` or `AFK`.
5. Identify blockers and ordering.
6. Map each slice back to PRD user stories or acceptance criteria.
7. Ask Ellie to get user approval if the granularity or dependencies are uncertain.

## Issue Shape

Each issue file should include:

- Parent PRD
- Title
- Type: `HITL` or `AFK`
- Blocked by
- What to build
- Acceptance criteria
- User stories addressed
- Likely files or areas
- Validation
- User test, if applicable
- Notes or risks

## Rules

- Create vertical slices, not horizontal layer tasks.
- Each issue should be demoable or verifiable on its own.
- Prefer many thin slices over a few thick slices.
- Keep dependencies explicit.
- Do not rewrite Sarah's PRD unless the slice cannot be made safely; report ambiguity to Ellie instead.
- Do not implement code.
- Do not review code.
- Do not route the workflow.

## Output

- Issue file paths
- Ordered slice summary
- Dependency map
- HITL or AFK labels
- Ambiguities needing Ellie or user approval
