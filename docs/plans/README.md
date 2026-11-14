# Plans — prompt-to-plan workflow

This directory is the hand-off point for agentic work. The user drops a prompt file, the agent
reads it **verbatim and in full**, writes a plan, and only then changes the repository.

## Naming contract

| File | Who writes it | Rule |
|---|---|---|
| `docs/plans/<slug>.prompt.txt` | The user | Authoritative request. Never edited, moved, or deleted by an agent. |
| `docs/plans/<slug>.plan.md` | The agent | Plan for the prompt with the **same stem**. Written before implementation. |
| `docs/plans/_template.plan.md` | Repo | Template. The leading underscore keeps it out of prompt/plan pairing. |

`<slug>` is lowercase kebab-case (e.g. `agentic-workflow`, `provider-audit-tab`). One prompt →
one plan. If a prompt is revised, use a new file (or bump the plan revision and record the
change); never silently rewrite history.

## Agent rules

1. **Read verbatim.** Open the prompt and read every line. Do not summarize away constraints,
   skip bullets, or infer from the filename. Long files: use `read` with `offset`/`limit`
   until the end.
2. **Never modify the prompt.** It is the record of the request.
3. **Quote the requirements in the plan.** The `Source prompt` section reproduces the request's
   bullets verbatim (or links them with exact quotes) and maps each to a change and a check.
4. **Investigate before planning.** Read the relevant requirement files, architecture/API docs,
   `DESIGN.md`, and `.agents/skills/`. Record the current state with file references.
5. **Record assumptions and open questions.** Ask the user only when blocked; otherwise choose a
   documented fallback and state it.
6. **Plan before code.** Write the plan, then implement in its order. Update the plan's status,
   decisions, progress log, and verification evidence as work proceeds.
7. **One logical change per PR.** Split the prompt across commits/PRs when it spans unrelated
   concerns; note the split in the plan.
8. **Update docs and skills in the same change.** A convention change updates the relevant
   `.agents/skills/` file; behavior changes update the requirement.
9. **Validate the pairing.** Run `npm run plans:check` when scripts are available.

## Plan lifecycle

| Status | Meaning |
|---|---|
| `draft` | Being written; not ready to implement |
| `ready` | Reviewed enough to start; no blocking questions |
| `in-progress` | Implementation underway |
| `implemented` | Acceptance checks pass, docs updated, pushed; link PR/commit |
| `blocked` | Waiting on an external decision/dependency; record the exact blocker |
| `superseded` | Replaced by a newer plan; link it |

## Template

Copy [\_template.plan.md](_template.plan.md) and fill every section. Required sections:

- Source prompt (verbatim + prompt path)
- Goal / non-goals
- Current state (repo facts)
- Decisions and assumptions (incl. open questions)
- Implementation plan (ordered steps, files, owners, dependencies)
- Contract/data impact
- Risks and mitigations
- Verification plan (commands, tests, manual checks)
- Docs and skills to update
- Rollout / rollback
- Acceptance checklist mapped to the prompt
- Progress log

## Validation

```bash
npm run plans:check
```

The checker verifies that every `*.prompt.txt` has a matching `*.plan.md` and that the plan
contains the required headings and status. It is advisory and local; it is not wired into CI so
uncommitted local prompts do not fail the pipeline.

## Examples

- `agentic-workflow.prompt.txt` / `agentic-workflow.plan.md` — the prompt that introduced this
  workflow (verbatim) and its plan; a reference implementation.
