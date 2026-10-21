# NFR-010 — Portability and deployment

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | Must |
| Phase | 1–5 |
| Owner | Platform |
| Source | [CI/CD](../10-ci-cd-and-environments.md) |

## Intent

Ship one immutable artifact that runs the same way on staging and production, with
configuration injected at runtime and a rollback that does not rebuild.

## Requirements

1. One container image contains the BFF + built SPA.
2. Build is reproducible from a clean checkout with a committed lockfile.
3. No secrets in build args, layers, source maps, or the image.
4. Runtime config via environment variables, validated at startup (fail fast).
5. Same image digest promoted from staging to production where possible.
6. Immutable tags (`sha-<short>`); no `latest` in production.
7. Reverse proxy terminates TLS; app port binds to localhost.
8. Health endpoint + smoke test after deploy.
9. Rollback by previous image tag < 5 minutes.
10. Container runs as non-root; minimal runtime; read-only FS where possible.
11. Logs to stdout JSON; no local state required (stateless sessions).
12. Staging and production use separate secrets, OIDC apps, and gateway targets.

## Acceptance criteria

- [ ] `docker build` from a clean checkout succeeds without secrets.
- [ ] Startup fails on missing/invalid env in production.
- [ ] Image scan has no critical/high vulnerabilities without a waiver.
- [ ] Same digest can run in staging and production with different env.
- [ ] Health/smoke pass after deploy.
- [ ] Rollback drill succeeds in < 5 minutes.
- [ ] Container is non-root and has no shell in runtime.
- [ ] Staging cannot reach production admin API/OIDC.
- [ ] Production deploy requires environment approval.

## Verification

- CI build + scan.
- Staging deploy + rollback drill.
- Env validation tests.
- Network/config review.

## Open questions

- Server OS/Docker version (Q11).
- Domain/TLS/proxy choice (Q10).
- Registry permissions/GHCR token (server setup).

## Traceability

[CI/CD §4–§8](../10-ci-cd-and-environments.md) · [Tech stack §2.6](../04-tech-stack.md) ·
[ADR-0006](../adr/0006-branching-and-deployments.md)
