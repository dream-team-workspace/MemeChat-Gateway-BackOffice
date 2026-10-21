# NFR-013 — Internationalization readiness

| Field | Value |
|---|---|
| Status | Deferred |
| Priority | Could |
| Phase | 4–6 |
| Owner | Frontend |
| Source | [Roadmap §8](../11-roadmap.md) |

## Intent

Keep the door open for a second language without rewriting the UI later. English is the only
shipped locale in v1.

## Requirements (design-time)

1. User-facing strings live in a central module or are extractable; no hardcoded strings deep in
   components where practical.
2. No string concatenation for sentences; use interpolated messages.
3. Numbers, dates, and currencies use `Intl` with an explicit locale.
4. Layout tolerates longer translations (no fixed-width labels that clip).
5. Icons are not the only label for an action.
6. Pluralization uses a library/format when a locale is added (not manual "s").
7. Locale is a user preference (future), not inferred only from the browser.

## Out of scope for v1

- Actual translations.
- RTL layout.
- Locale-specific legal copy.
- Server-rendered localized content.

## Acceptance criteria (for v1)

- [ ] English copy is consistent and centralized enough to extract.
- [ ] Dates/times use `Intl` with the user's locale/time zone.
- [ ] Numbers/credits use `Intl.NumberFormat`.
- [ ] No hardcoded English in low-level UI primitives (they accept children/labels).
- [ ] Layouts do not clip at +30% text length for core controls.
- [ ] The decision to add a locale has a documented path (library, files, review).

## Future work

- Choose i18n library (e.g., Lingui/FormatJS) when a locale is funded.
- Add RTL support (logical properties) if an RTL locale is required.
- Translate docs/errors with a glossary.

## Verification

- Code review for string centralization.
- Pseudo-locale test (+30% length) before adding a language.
- `Intl` unit tests.

## Traceability

[Roadmap §8](../11-roadmap.md) · [DESIGN §10](../../DESIGN.md)
