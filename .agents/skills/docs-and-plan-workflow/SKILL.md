---
name: docs-and-plan-workflow
description: The documentation-first and prompt-to-plan workflow: read docs/plans/*.prompt.txt verbatim, write the matching *.plan.md, keep requirements/ADRs in sync, and follow branch and commit policy. Load for multi-step tasks or when handed a prompt file.
---

# Docs and prompt-to-plan workflow

## Use this skill when

- The user points at `docs/plans/<slug>.prompt.txt` (or says "the prompt file").
- A task spans multiple steps, files, or sessions.
- A behavior change needs requirement/architecture/API docs updated.
- You are about to commit or open a PR.

## Prompt → plan contract (hard rules)

The repository is **documentation-first**. Multi-step work starts from a prompt file and a
matching plan.

1. **Read the whole prompt, verbatim.** Open `docs/plans/<slug>.prompt.txt` and read it with
   `read` (use `offset`/`limit` if long). Do not skim, summarize away constraints, or infer
   requirements from the filename. Treat every bullet as part of the acceptance contract.
2. **Never edit, move, rename, or delete a `.prompt.txt`.** It is the user's record. If the
   prompt changes, the user or a new task supplies the new content.
3. **Write the plan to `docs/plans/<slug>.plan.md`** — same stem as the prompt — using
   `docs/plans/_template.plan.md`. Do this before changing code.
4. **Quote the prompt's requirements in the plan** (a `Source prompt` section) and map each one
   to a planned change and a verification step. Anything not addressed is an open question, not
   a silent omission.
5. **Read comprehensively.** Cross-check the prompt against the requirement files, the relevant
   architecture/API docs, `DESIGN.md`, and `.agents/skills/`. Record conflicts and resolve them
   by the precedence rules below; never guess a requirement.
6. **Ask only blocking questions.** Non-blocking ambiguity becomes an explicit assumption in the
   plan, with the fallback chosen.
7. **Keep the plan alive.** Update `status`, decisions, progress, and the final verification
   evidence as work proceeds. Mark it `implemented` only after the change is verified and
   pushed; link the PR/commit.
8. **One plan per prompt.** Do not merge prompts or reuse a plan for unrelated work.
9. **Run `npm run plans:check`** (when the script is present) to verify every prompt has a plan
   with the required sections before handing off.

Full conventions: `docs/plans/README.md`. Template: `docs/plans/_template.plan.md`.

## Documentation map and precedence

| Source | Authority |
|---|---|
| `docs/requirements/FR-*`, `NFR-*` | Behavior contract; acceptance criteria |
| `DESIGN.md` | Visual/token/interaction rules |
| `docs/03-architecture.md` | Structure, domains, BFF boundaries |
| `docs/06-api-integration.md` | Canonical payloads, errors, pagination |
| `docs/02-backend-contract-analysis.md` | What the gateway really exposes/gaps |
| `docs/10-ci-cd-and-environments.md` | Branches, CI, deploy |
| `docs/14-cloudflare-access.md` | Access/tunnel setup |
| `docs/15-gateway-requests.md` | Gateway changes requested by the console |
| `docs/16-react-architecture.md` | Composition/React rules |
| `docs/README.md` | Index and status legend |
| `.agents/skills/` | Agent playbooks distilled from the above (never authoritative) |

When docs disagree: requirement file wins for behavior, `DESIGN.md` for visuals,
`docs/03-architecture.md` for structure. Fix the docs in the same change.

## Requirement files

Each `docs/requirements/FR-*.md` / `NFR-*.md` has a metadata table (status, priority, phase,
deps, source), then: Intent, Scope (in/out), Behavior, Acceptance criteria, Data and API,
Security and audit, Test notes, Traceability. Statuses: Proposed, Accepted, In progress,
Implemented, Deferred, Blocked. Update the file **and** the index row
(`docs/requirements/README.md`) when behavior or status changes. Never delete a requirement to
make a milestone look complete.

## Doc update matrix

| Change | Update |
|---|---|
| Behavior/acceptance | requirement file + `docs/requirements/README.md` row |
| New/changed endpoint or payload | `docs/06-api-integration.md`, shared schema, requirement |
| Gateway dependency/gap | `docs/15-gateway-requests.md` (exact contract + deploy order) |
| Structure/domain/boundary | ADR (`docs/adr/`) + `docs/03-architecture.md` |
| Visual/token/pattern | `DESIGN.md` + screenshots/contrast check |
| Branch/CI/deploy/secret | `docs/10-ci-cd-and-environments.md`, `docs/14-cloudflare-access.md`, `deploy/README.md` |
| Repo convention or workflow | `AGENTS.md`, `.agents/skills/`, `docs/README.md` if indexed |
| User-visible feature | `README.md` "What is implemented" when it changes the product story |

Also update `.agents/skills/` when a convention it documents changes — skills must not drift.

## Writing style

- Markdown, sentence-case headings, tables for matrices, short paragraphs.
- ASCII-friendly diagrams; no screenshot as the only source of truth.
- State status explicitly ("Implemented", "In progress", "Not implemented") rather than
  implying completeness.
- Link related docs with relative paths; keep `docs/README.md` and `AGENTS.md` indexes in sync.
- Errors/gaps: say what is missing and what the console does instead; never present a fallback
  as real data.
- No secrets, tokens, real customer identifiers, or full production payloads in docs or plans.

## Branch, commit, PR policy

- `master` = production deploy. Never push directly.
- `development` = integration branch; feature PRs target it.
- Work branches: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`, `hotfix/<slug>`.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`);
  squash merge; one logical change per PR.
- CI: lint on PR; clean build on `development` push; deploy on `master` push.
- Never commit secrets, `.env` files, session data, build output, or IDE files.

## Task tracking (agent teams)

For a large prompt, decompose in the plan and use shared tasks if Agent Teams is active: one
owner per write scope, dependencies for ordered work, and a final Lead verification. Keep task
descriptions self-contained (context + acceptance) because teammates do not see the Lead's
conversation.

## Checklist

- [ ] Prompt read in full; every bullet mapped to a plan step.
- [ ] `docs/plans/<slug>.plan.md` exists and follows the template.
- [ ] Related requirement/API/architecture/design docs identified.
- [ ] Assumptions and open questions recorded.
- [ ] Implementation order and write scopes clear.
- [ ] Verification commands + acceptance checklist in the plan.
- [ ] Plan status and progress updated; docs updated in the same PR.
- [ ] `npm run plans:check` passes (or its absence is explained).

## References

- [docs/plans/README.md](../../../docs/plans/README.md) — prompt/plan conventions.
- [docs/plans/_template.plan.md](../../../docs/plans/_template.plan.md) — plan template.
- [references/docs-map.md](references/docs-map.md) — doc index, statuses, update matrix.
- `AGENTS.md` — repo status, commands, architecture rules, branch policy.
