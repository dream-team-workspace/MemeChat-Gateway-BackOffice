# Repo-local agent skills

This directory holds the agent playbooks for the MemeChat Gateway BackOffice. They are
discovered automatically from `.agents/skills/<name>/SKILL.md` (one level deep) and loaded
on demand: an agent sees the `name` + `description` in its skill catalog, then reads the body
only when the task matches.

## Skills

| Skill | Load it when |
|---|---|
| `project-architecture` | Orienting in the repo, adding files, or planning a cross-cutting change |
| `frontend-feature-workflow` | Any `src/` change: pages, routes, queries, mutations, forms, UI |
| `bff-and-gateway` | Any `server/` change, new BFF route, or gateway contract change |
| `shared-contract` | A payload, field, enum, error code, or pagination shape changes |
| `design-system` | UI/visual changes, new components, tokens, accessibility |
| `testing-and-quality` | Before claiming a change is done; adding or fixing tests |
| `docs-and-plan-workflow` | Multi-step tasks, requirement/doc updates, or a `docs/plans/*.prompt.txt` |
| `code-style` | Before writing/reviewing code: TypeScript, naming, imports, formatting, comments, commits |
| `stack-reference` | A change depends on library behavior, or a dependency upgrade is proposed |

## Authoring rules

- Frontmatter is required: `name` must be kebab-case and match the directory, `description` is
  one sentence that tells an agent when to load the skill. Keep the body operational.
- Put deep material in `references/` inside the skill bundle; keep `SKILL.md` scannable.
- Skills are **derived** from the repository and its docs. They are not a second source of
  truth: when a convention changes, update the skill in the same pull request as the change.
  When a skill disagrees with `docs/requirements/`, `DESIGN.md`, or the code, those win.
- Never put secrets, tokens, real customer identifiers, or copied production payloads here.
- Do not create a skill per endpoint, per page, or per library. Extend an existing skill until
  a genuinely new concern appears.

## Related workflow

The prompt-to-plan contract lives in [docs/plans/README.md](../docs/plans/README.md). The
task board, docs map, and branch policy are summarized in
[docs-and-plan-workflow](skills/docs-and-plan-workflow/SKILL.md).
