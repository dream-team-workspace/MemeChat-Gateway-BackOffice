# ADR-0004 — shadcn/ui components are owned source

- **Status:** Proposed
- **Date:** 2026-10-21
- **Deciders:** Frontend/design

## Context

The team wants the shadcn/ui design model: accessible primitives, Tailwind, CSS variables, and
full control over markup. Installing a traditional component library (MUI/AntD) hides the
implementation behind a versioned package and conflicts with the chosen tokens.

## Decision

Use the **shadcn CLI** to copy primitives into `src/components/ui`. The repository owns the
source. Components are composed in `components/common` and feature folders. The tweakcn theme
is installed as CSS variables and committed; the runtime does not fetch a theme.

Do not wrap every primitive. Local patches are minimal and marked with a `PATCH:` comment.

## Consequences

Positive:

- Full control over markup, styles, accessibility, and behavior.
- No runtime UI package to upgrade; diffs are visible in PRs.
- The token system and Tailwind utilities stay consistent.
- Components can be deleted when unused.

Negative:

- We own maintenance and upstream diffs.
- Upgrades are manual (re-run the registry and review changes).
- Contributors must understand the composition rules to avoid a parallel design system.
- Accessibility is inherited but can still be broken by composition; tests are required.

## Alternatives considered

- **MUI/AntD/Chakra**: fast start, but a second design system, theming friction, and less
  control over the exact token contract.
- **Headless-only (Radix) without shadcn**: more work to reach a consistent baseline.
- **Internal package**: useful at multi-app scale; premature here.

## Follow-up

- Pin the CLI version per PR; commit generated files.
- Add a patch log and visual regression for patched components.
- Review the component inventory each phase; remove unused primitives.
