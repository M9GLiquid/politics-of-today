---
name: write-prd
description: Write a Product Requirements Document from Nerd Herders context and optional Chuck research. Use after the user has approved clarification with BACK TO ELLIE and Ellie needs Sarah to create a PRD Markdown artifact before issue slicing.
---

# Write PRD

## Goal

Create a clear Markdown PRD that captures the agreed product intent before implementation planning begins.

## Inputs

- Nerd Herders final clarification packet
- User-approved decisions
- Chuck research findings, if any
- Relevant repo context
- Constraints and non-goals

## Artifact

Write or propose a PRD Markdown file under `docs/prds/` unless Ellie specifies another location.

Use a stable filename such as:

```text
docs/prds/YYYYMMDD-short-feature-name.md
```

## PRD Shape

- Title
- Status
- Source conversation summary
- Problem or opportunity
- Goals
- Non-goals
- User stories
- Functional requirements
- UX and content requirements, if relevant
- Data, auth, security, or privacy considerations
- Edge cases
- Acceptance criteria
- Open questions
- References to Chuck findings, if any

## Rules

- Preserve the user-approved behavior from the Nerd Herders.
- Do not invent scope to make the PRD feel complete.
- If a requirement is unclear, mark it as an open question instead of deciding it silently.
- Keep the PRD implementation-aware enough for Devon to slice, but do not break it into implementation issues.
- Do not route the workflow.
- Do not implement code.

## Output

- PRD path
- PRD summary
- Open questions, if any
- Whether the PRD is ready for Devon
