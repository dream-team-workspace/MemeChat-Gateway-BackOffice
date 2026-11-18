# Documentation map and update rules

## Index

| Doc | Answers |
|---|---|
| `docs/README.md` | index + status legend + how to change the corpus |
| `docs/00-project-brief.md` | why the console exists, success measures |
| `docs/01-product-scope.md` | product boundaries |
| `docs/02-backend-contract-analysis.md` | what the gateway exposes today, gaps G1–G18 |
| `docs/03-architecture.md` | runtime topology, domains, BFF, boundaries, rejected alternatives |
| `docs/04-tech-stack.md` | versions, rationale, rejected libraries, version policy |
| `docs/05-information-architecture.md` | sidebar, route catalog, page specs, flows |
| `docs/06-api-integration.md` | BFF catalog, canonical types, mapping, pagination, errors, mutation protocol |
| `docs/07-security-model.md` | threat model, Access, secrets, CSRF/CORS, logging, money controls |
| `docs/08-engineering-standards.md` | folders, naming, imports, forms, styling, a11y, DoD |
| `docs/09-testing-strategy.md` | pyramid, E2E scenarios, fixtures, CI gates (some future) |
| `docs/10-ci-cd-and-environments.md` | branches, CI, deploy, environments |
| `docs/11-roadmap.md` | phases and remaining work |
| `docs/12-risks-and-open-questions.md` | risks, open questions, assumptions |
| `docs/13-glossary.md` | terms |
| `docs/14-cloudflare-access.md` | Access/Tunnel setup and troubleshooting |
| `docs/15-gateway-requests.md` | gateway contract status + exact requested changes |
| `docs/16-react-architecture.md` | composition rules and React 19 defaults |
| `docs/requirements/` | one FR/NFR file per behavior, acceptance criteria |
| `docs/adr/` | architecture decision records 0001–0008 |
| `docs/plans/` | prompt → plan pairs (`*.prompt.txt`, `*.plan.md`) |
| `.agents/skills/` | agent playbooks derived from the above |

## Precedence

1. Requirement file (`docs/requirements/`) — behavior and acceptance.
2. `DESIGN.md` — visuals, tokens, interaction.
3. `docs/03-architecture.md` — structure, domains, boundaries.
4. `docs/06-api-integration.md` — canonical API shapes.
5. Other docs, then `.agents/skills/` (never authoritative).

Where docs disagree, fix them in the same change. If a requirement is superseded, mark it
Superseded and point at the replacement — do not delete it silently.

## Update matrix (same PR)

| Change | Update |
|---|---|
| Behavior/acceptance | FR/NFR file + `docs/requirements/README.md` row |
| API endpoint/payload/error | `docs/06-api-integration.md` + shared schema + requirement |
| Gateway dependency/gap | `docs/15-gateway-requests.md` (why, SQL, JSON, deploy order, acceptance) |
| Structure/domain/boundary | ADR + `docs/03-architecture.md` |
| Visual/token/pattern | `DESIGN.md` + screenshots + contrast check |
| Branch/CI/deploy/secret | `docs/10-ci-cd-and-environments.md`, `docs/14-cloudflare-access.md`, `deploy/README.md` |
| Product story/status | `README.md` "What is implemented" / "What remains" |
| Agent workflow/convention | `AGENTS.md`, `.agents/README.md`, relevant `SKILL.md`, `docs/README.md` |

## Requirement file template

```md
# FR-0NN — Title

| Field | Value |
|---|---|
| Status | Proposed | Accepted | In progress | Implemented | Deferred | Blocked |
| Priority | Must | Should | Could |
| Phase | 1–5 |
| Depends on | ... |
| Source | IA section / gateway request |

## Intent
## Scope
In scope: ...
Out of scope: ...

## Behavior
1. ...
## Acceptance criteria
- [ ] ...
## Data and API
| Method | Path | Notes |
## Security and audit
## Test notes
## Traceability
[links]
```

## Writing rules

- Status explicit; no implied completeness. "Implemented (deploy pending)" is a legitimate
  status in a table when the code exists but the branch is not deployed.
- Prefer tables for endpoint/field matrices; keep diagrams ASCII; link relative paths.
- Record gaps and the console's honest fallback; never present missing data as real.
- Requirement = behavior contract, not implementation diary. Keep implementation notes short
  and dated.
- No screenshots as the only source of truth; no secrets/real customer data.
- Keep `docs/README.md` and `AGENTS.md` indexes current when adding a doc.

## Plans

- `docs/plans/<slug>.prompt.txt` is the user's verbatim request; never edit it.
- `docs/plans/<slug>.plan.md` is the agent's plan; use `_template.plan.md`.
- Plan status: `draft` → `ready` → `in-progress` → `implemented` (or `blocked`).
- The plan quotes requirements, maps them to changes and verification, records assumptions,
  risks, rollout/rollback, and a progress log.
- Run `npm run plans:check` to verify prompt/plan pairing and required sections.
