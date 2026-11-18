---
plan: agentic-workflow
prompt: ./agentic-workflow.prompt.txt
status: implemented
created: 2026-11-14
updated: 2026-11-14
branch: feat/agentic
owner: lead (DeepSeek Harness)
---

# Plan — Agentic workflow, repo skills, and stack research

> Derived from `agentic-workflow.prompt.txt`. The prompt is authoritative; this plan records
> how the repository satisfies it. Every prompt bullet is mapped in §11.

## 1. Source prompt (verbatim)

> I need you to create new branch from origin development name feat/agentic and adjust
> everything according to this:
>
> - In future, I will give prompt under docs/plans/*.prompt.txt
> - In future, you supposed to read verbatim and comprehensively about the prompt I gave you
>   from the file *.prompt.txt and write plan to *.plan.md.
> - Extract everything about this project structure, architecture, module, code pattern, style
>   writing into .agents/skills.
> - Search from all internet about the tech stack been used by this project and skills
>   according that.
> - When done, push everything to origin

## 2. Goal and non-goals

**Goal.** Establish the repository conventions for prompt-driven agent work and give future
agents a reliable, repo-local knowledge base:

1. A `feat/agentic` branch created from `origin/development`.
2. A documented prompt → plan contract under `docs/plans/` that future agents follow.
3. Repo-local skills in `.agents/skills/` covering structure, architecture, modules, code
   patterns, and writing style.
4. Internet-researched, version-specific guidance for the pinned stack, linked to official
   sources.
5. Everything committed and pushed to `origin`.

**Non-goals.**

- No product behavior, UI, BFF, or gateway contract changes.
- No dependency upgrades in this change.
- No change to the gateway repository.
- No wiring of the new checks into CI (the plan checker stays local/advisory).

## 3. Current state

- The repository had no `.agents/` directory and no `docs/plans/` directory.
- `AGENTS.md` described the implementation and branch policy but had no prompt/plan workflow
  and no repo-skill source of truth.
- `docs/README.md` indexed the docs corpus but not plans or skills.
- The pinned stack is documented in `docs/04-tech-stack.md`; actual code diverges from some
  planning notes (TanStack Table, sonner, Zustand, pino, MSW, Playwright are not installed;
  most dialogs use controlled state + `schema.safeParse` rather than RHF).
- The repo is documentation-first: requirements + `DESIGN.md` + architecture/API docs are the
  sources of truth (`AGENTS.md`).

## 4. Decisions and assumptions

| # | Decision / assumption | Rationale | Needs confirmation? |
|---|---|---|---|
| D1 | Branch `feat/agentic` from `origin/development` (not from the old local branch) | Explicit prompt instruction; `development` is the integration branch | no |
| D2 | One plan file per prompt with the same stem | Mechanical pairing enables checking; keeps traceability | no |
| D3 | Prompt files are never edited by agents | The prompt is the user's record; plans are the editable artifact | no |
| D4 | Skills are distilled, non-authoritative playbooks | Avoids a second source of truth; docs/code win on conflict | no |
| D5 | Eight focused skills rather than one large file | Catalog descriptions let agents load only what they need; no per-endpoint skills | no |
| D6 | Capture actual code patterns, including divergences from docs (RHF vs controlled dialogs, missing libraries) | Agents need the truth, not the aspirational plan | no |
| D7 | Add a local `plans:check` script, not a CI gate | Pairing matters for agents; an untracked local prompt must not break CI | no |
| D8 | Include this request itself as the first prompt/plan example | Proves the workflow and gives the checker a real pair | no |
| D9 | Stack guidance records pinned vs latest versions at research time (2026-11-14) and defers TS 7 | Repo policy pins exact versions; majors need an ADR | no |

Non-blocking open questions: none required to proceed.

## 5. Implementation plan

| # | Step | Files / areas | Depends on | Owner |
|---|---|---|---|---|
| 1 | Create `feat/agentic` from `origin/development` | git branch | — | lead |
| 2 | Write the prompt → plan contract and template | `docs/plans/README.md`, `_template.plan.md`, `agentic-workflow.prompt.txt` | 1 | lead |
| 3 | Write repo skills (architecture, frontend, BFF, contract, design, testing, workflow, stack) | `.agents/skills/**`, `.agents/README.md` | 1 | lead |
| 4 | Research the pinned stack on the internet and record sources | `.agents/skills/stack-reference/**` | 3 | lead |
| 5 | Add the local pairing checker | `scripts/check-plans.mjs`, `package.json` | 2 | lead |
| 6 | Link the workflow from the repo indexes | `AGENTS.md`, `docs/README.md`, `README.md` | 2,3 | lead |
| 7 | Validate: skill frontmatter/discovery, plan pairing, lint/typecheck/test/build, docs links | local commands | 2–6 | lead |
| 8 | Commit and push to `origin feat/agentic` | git | 7 | lead |

Write scopes are disjoint per step; no Agent Teams fan-out was needed for this documentation
change.

## 6. Contract and data impact

- Shared Zod schemas: none.
- BFF routes: none.
- Gateway contract (`docs/15-gateway-requests.md`): none.
- Database/migrations: none.
- UI/routes: none.
- Repository metadata: new `.agents/`, `docs/plans/`, `scripts/check-plans.mjs`, npm script
  `plans:check`, index/doc updates, new branch.

## 7. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Skills drift from code/docs | medium | Agents follow stale rules | Skills say docs/code win; update skill in the same PR as the convention; explicit "current gaps" sections |
| Skill catalog bloat / wrong invocation | low | Agents load the wrong skill | One sentence per description, eight focused skills, no per-endpoint skills |
| Prompt files contain sensitive information | low | Leak into git | README/AGENTS warn to review prompts before committing; no secrets in examples |
| Checker false positives on uncommitted local prompts | medium | Local check fails | Checker is local only, skips `_template`, and documents the behavior |
| Duplicating docs creates contradictions | medium | Confusion | Skills are explicitly non-authoritative and cite the docs; `AGENTS.md` precedence retained |
| Stack guidance ages | medium | Misleading API advice | Version table dated; sources file; upgrade checklist |

## 8. Verification plan

- [x] `git status` confirms branch `feat/agentic` from `origin/development`.
- [x] Skill files: frontmatter has kebab-case `name` matching directory and a non-empty
      `description`; discovery confirmed by the harness catalog update (`stack-reference`).
- [x] `npm run plans:check` passes for the new prompt/plan pair.
- [x] Relative links in new/changed Markdown resolve.
- [x] `npm run lint`, `npm run typecheck`, `npm test` (29/29), `npm run build` all pass;
      `npm run plans:check` passes; separate checks confirm 9 valid skill bundles and 71/71
      relative links resolve.
- [x] Commit contains no secrets, `.env`, build output, or IDE files.
- [x] Push to `origin feat/agentic` confirmed; branch tracks `origin/feat/agentic`.

## 9. Docs and skills to update

| Doc/skill | Change |
|---|---|
| `docs/plans/README.md`, `_template.plan.md`, prompt + plan | New workflow and first example |
| `.agents/README.md`, `.agents/skills/**` | New repo skills and stack research |
| `AGENTS.md` | Sources of truth + prompt→plan section + branch status |
| `docs/README.md` | Index plans and skills |
| `README.md` | Workflow/docs links and working-branch correction |
| `package.json` | `plans:check` script |

## 10. Rollout and rollback

- Rollout: push `feat/agentic` to origin and open a PR into `development` (not `master`); the
  change is documentation/tooling only, no deploy impact. CI runs ESLint on the PR; the new
  script is not a CI job.
- Rollback: revert the commit; no migrations, env, or gateway changes to undo. Deleting
  `.agents/skills` reverts agent behavior to `AGENTS.md` + docs.

## 11. Acceptance checklist (mapped to the prompt)

- [x] Prompt bullet 1 — branch `feat/agentic` created from `origin/development` (§5 step 1).
- [x] Prompt bullet 2 — `docs/plans/*.prompt.txt` convention documented; future agents must
      read verbatim; plan written to `*.plan.md` (§5 steps 2, 4; `docs/plans/README.md`,
      `.agents/skills/docs-and-plan-workflow/SKILL.md`).
- [x] Prompt bullet 3 — structure, architecture, modules, code patterns, style writing
      extracted into `.agents/skills/` (§5 step 3; eight skills + references).
- [x] Prompt bullet 4 — internet research of the pinned stack recorded with official sources
      and version-specific guidance (§5 step 4; `stack-reference`).
- [x] Prompt bullet 5 — everything committed and pushed to `origin` (commit `f773bf1` on
      `origin/feat/agentic`; §5 step 8).

## 12. Progress log

| Date | Change | Status |
|---|---|---|
| 2026-11-14 | Branch created from `origin/development` | done |
| 2026-11-14 | Prompt/plan contract + template + first prompt/plan | done |
| 2026-11-14 | Eight repo skills + `.agents/README.md` | done |
| 2026-11-14 | Stack research and sources | done |
| 2026-11-14 | Checker, index updates, validation | done |
| 2026-11-14 | Commit `f773bf1` + push to `origin/feat/agentic`; plan marked implemented | done |

## 13. References

- Prompt: `./agentic-workflow.prompt.txt`
- Workflow: `docs/plans/README.md`
- Skills: `.agents/README.md`, `.agents/skills/`
- Repo rules: `AGENTS.md`, `docs/08-engineering-standards.md`, `docs/10-ci-cd-and-environments.md`
- Stack: `docs/04-tech-stack.md`, `.agents/skills/stack-reference/references/sources.md`
- Implementation commit: `f773bf1`; remote: `origin/feat/agentic`
