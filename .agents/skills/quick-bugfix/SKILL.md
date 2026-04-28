---
name: quick-bugfix
description: Fix a narrow bug quickly without entering the full Ellie PRD workflow. Use when the user invokes General Beckman or asks for a direct bug fix, regression fix, failing test fix, runtime error fix, typo-level behavior fix, or small broken-flow repair.
---

# Quick Bugfix

## Goal

Diagnose and fix one concrete bug with the smallest useful patch, validate it, then send it to John Casey for review and fix any review findings.

This is the fast path. It bypasses Ellie, the Nerd Herders, PRDs, and issue slicing unless the bug report turns into a larger product or design change.

## Inputs

- User's bug report
- Error message, failing test, screenshot, or reproduction steps if available
- Relevant repo files

## Process

1. Restate the suspected bug and the narrow scope.
2. Reproduce or inspect the failure when practical.
3. Identify the smallest safe fix.
4. Edit only files required for the bug.
5. Run the most targeted validation available.
6. Spawn John Casey to review the bugfix diff, validation, and scope.
7. If John returns `fixable`, apply the required fixes and rerun targeted validation.
8. Repeat John review until the status is `approved`, `blocked`, or `unclear`.
9. Report the final fix, validation, John review status, and any residual risk.

## Escalation

Stop and ask for Ellie or clarification if:

- The report is actually a new feature or product decision.
- The fix requires broad refactoring.
- The intended behavior is ambiguous.
- The bug touches security, auth, payments, data loss, or irreversible user action and the correct behavior is unclear.

## Rules

- Prefer direct execution over planning.
- Keep scope narrow.
- Do not create a PRD.
- Do not create issue files.
- Do not use the Nerd Herders unless the behavior is ambiguous.
- Do not route work to Sarah, Devon, or Charles.
- John Casey review is required after the first patch unless the fix is blocked before editing.
- Do not make unrelated cleanup changes.

## Output

- Bug fixed
- Files changed
- Validation run
- John review status
- Review fixes applied, if any
- Residual risk or follow-up, if any
