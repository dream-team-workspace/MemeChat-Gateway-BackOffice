---
plan: <slug>
prompt: ./<slug>.prompt.txt
status: draft
created: YYYY-MM-DD
updated: YYYY-MM-DD
branch: <feat|fix|chore>/<slug>
owner: <agent or human>
---

# Plan — <title>

> This plan is derived from the prompt at `<slug>.prompt.txt`. The prompt is authoritative;
> this file records how the repository will satisfy it. Delete nothing from the prompt's scope
> without an explicit decision below.

## 1. Source prompt (verbatim)

Paste the prompt's requirements verbatim here (or quote each bullet exactly). Do not paraphrase
the requirements in this section.

## 2. Goal and non-goals

- Goal:
- Non-goals:

## 3. Current state

Facts discovered in the repository before planning (files, docs, current behavior, gaps). Cite
paths and line numbers where useful.

## 4. Decisions and assumptions

| # | Decision / assumption | Rationale | Needs confirmation? |
|---|---|---|---|
| D1 | | | no |

Open questions (blocking vs non-blocking):

- [ ] …

## 5. Implementation plan

Ordered steps. Note write scopes and dependencies if Agent Teams is used.

| # | Step | Files / areas | Depends on | Owner |
|---|---|---|---|---|
| 1 | | | — | |

## 6. Contract and data impact

- Shared Zod schemas:
- BFF routes:
- Gateway contract (docs/15-gateway-requests.md):
- Database/migrations:
- UI/route changes:

## 7. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| | | | |

## 8. Verification plan

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Targeted manual/browser checks:
- [ ] New/updated tests:
- [ ] Docs/skills checked for staleness:

## 9. Docs and skills to update

| Doc/skill | Change |
|---|---|
| `docs/requirements/…` | |
| `docs/06-api-integration.md` | |
| `.agents/skills/…` | |

## 10. Rollout and rollback

- Rollout order (gateway migration before console deploy, feature flags, branch/PR target):
- Rollback:

## 11. Acceptance checklist (mapped to the prompt)

- [ ] Prompt bullet 1 → change → verification
- [ ] Prompt bullet 2 → change → verification

## 12. Progress log

| Date | Change | Status |
|---|---|---|
| YYYY-MM-DD | Plan created | draft |

## 13. References

- Prompt: `./<slug>.prompt.txt`
- Related requirements/docs:
- Related PR/commit:
