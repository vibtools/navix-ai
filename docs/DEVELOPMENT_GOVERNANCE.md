# Development Governance and Approval Gates

## Mandatory workflow

1. Re-verify the frozen baseline and current GitHub HEAD.
2. Inspect exact affected paths and root causes.
3. Produce a phase plan with finding IDs, file impact, compatibility, tests, exclusions, UI impact, and rollback.
4. Lock scope and provide one exact approval command.
5. Wait for the user to paste it; no implementation starts earlier.
6. Implement only approved scope in small auditable changes.
7. Run applicable syntax, build, unit, integration, security, UI/UX, performance, and edge checks.
8. Fix in-scope regressions; request a revised plan/approval for expansion.
9. Update README, changelog, roadmap, actual status, error matrix, traceability, and phase log where affected.
10. Push verified changes to GitHub and report commit evidence.

## Required scope-lock fields

- Exact phase/finding IDs and root causes.
- Exact expected files/components.
- Existing features/data contracts that cannot change.
- Required new UI and its non-regression constraints.
- Explicit exclusions.
- Test matrix and objective exit criteria.
- Documentation updates.
- Git/rollback strategy.
- Exact approval command.

## Change control

- No hidden refactor, opportunistic redesign, unrelated cleanup, dependency swap, feature removal, or version bump.
- A new material blocker is documented first; scope expansion requires a revised plan and approval.
- Backward-incompatible data changes require tested forward migration and safe rollback/fallback.
- Existing visual structure stays intact. New UI is allowed only for approved capability, safety, recovery, or privacy needs.
- Documentation and source change together when behavior changes.
- Completion requires evidence; commit messages/build success alone are insufficient.

## GitHub policy

- GitHub is the authoritative implementation destination.
- Start each phase from verified HEAD and record its SHA.
- Use an isolated phase branch when available and small root-cause-focused commits.
- Never force-push over accepted history or remove baseline evidence.
- Never create a tag/release or publish an extension artifact before Phase 04 approval/acceptance.

## Workflow freeze

Extension build/ZIP generation stays strictly paused through Phases 01-03 and the implementation portion of Phase 04. Restore it only after Phase 04 release gates pass and final artifact generation is approved.

## Approval command format

`APPROVE NAVIX-AI PHASE-XX IMPLEMENTATION — SCOPE LOCKED`

Only the exact command for the currently proposed phase authorizes work. One phase never authorizes another or a material scope expansion.
