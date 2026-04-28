---
name: research-review
description: Gather implementation-focused technical context for Ellie, Sarah, and Devon. Use when a clarified request has a concrete codebase, library, API, security, architecture, standards, or prior-art question that blocks safe PRD writing or PRD-to-issues slicing.
---

# Research Review

## Goal

Answer PRD-critical or slicing-critical technical questions without taking ownership of PRD writing, issue slicing, implementation, review, or routing.

## Inputs

- Ellie's research handoff
- Clarified user request
- Relevant user decisions and constraints
- Specific research questions

## Process

1. Restate the research target.
2. Inspect project-local code and patterns first when relevant.
3. Check primary sources for unstable or external facts.
4. Separate confirmed facts from assumptions.
5. Return only findings that affect Sarah's PRD, Devon's issue slicing, or Charles's execution.

## Output

- Confirmed facts
- Assumptions or unresolved unknowns
- Risks
- Planning implications
- Relevant files, APIs, or docs

## Do Not

- Do not route the workflow.
- Do not write the implementation plan.
- Do not edit files.
- Do not perform code review.
- Do not broaden research beyond Ellie's question.
