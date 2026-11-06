# FR-021 — Provider registry, credentials, and models

| Field | Value |
|---|---|
| Status | Implemented (gateway routing branch deployment pending) |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend + gateway |
| Depends on | FR-002; gateway migrations 0009 and 0010 |
| Source | Gateway working tree `docs/21-ability-provider-model-routing.md` §4–§5; [API §2.2](../06-api-integration.md) |

## Intent

Let an operator add or edit a provider, set its API key without a redeploy, and manage the
models it advertises — while guaranteeing that a saved key is never returned or rendered.

## Scope

In scope:

- Provider index with search and kind filter (language, speech, embeddings, vector).
- Create/edit metadata: display name, optional id, kind, base URL, enabled, advanced JSON.
- Write-only API key: set on create, replace, or remove with explicit confirmation.
- Provider detail: credential summary, connection, model catalog, persisted health.
- Model upsert/delete: id, display name, fixed ability, enabled, config, cost fields, order.
- Health probe from the index and detail; persisted last check.
- Empty/loading/error states and 409/422/503 mapping.

Out of scope:

- Editing the adapter code or provider enum beyond the five kinds.
- Reading a plaintext key after save.
- Per-provider audit UI (the gateway writes `provider_audit`; no read endpoint yet).

## Behavior

1. `GET /api/admin/providers` renders cards. A missing key is amber and disables probing;
   a stored key that cannot be decrypted is a red `Credential error`, not `Key missing`;
   health comes from `lastCheck` when present. The BFF derives `credentialState`
   (`ready` / `missing` / `unreadable`) once, and components render it without re-deriving.
2. Add provider opens a dialog; the key field is a password input with show/hide,
   `autocomplete="new-password"`, and is cleared on close. Edit never prefills a key.
3. Create/update sends camelCase to the BFF; the BFF converts to snake_case. Omitting
   `apiKey` keeps the stored key; `clearApiKey: true` removes it.
4. Detail tabs are Overview, Models, Health. The Models tab edits catalog entries; the model
   id is immutable and the ability is fixed to the provider kind.
5. Delete confirmation stays open on 409 `PROVIDER_IN_USE`. The BFF enriches the error
   with `details.appClients` from the app-client read model; the dialog lists those clients
   and links to each. If the enrichment read fails, it shows the reassign instruction.
6. A missing `PROVIDER_SECRET_KEY` on the gateway returns 503
   `SECRET_KEY_NOT_CONFIGURED`; the dialog explains the gateway env requirement.
7. All provider/model mutations invalidate the provider cache, the ability catalog, and
   app-client route data so display names and selectable options stay consistent.

## Acceptance criteria

- [x] An operator can create a provider and save an API key without a redeploy.
- [x] No BFF or browser response contains `api_key`, `apiKey`, or a plaintext key.
- [x] A saved key shows only `•••• {hint}` and its update timestamp.
- [x] Replace/remove key are explicit dialogs; remove requires acknowledgement.
- [x] A provider can advertise multiple models for its ability.
- [x] Model id is immutable on edit; ability mismatch is prevented in the UI and mapped on 422.
- [x] Provider/model delete conflicts preserve the dialog and show the gateway message.
- [x] A stored key that cannot be decrypted shows `Credential error` / `Stored key unavailable`,
  links to the gateway `PROVIDER_SECRET_KEY` help, and never says only “Add key”.
- [x] Provider/model delete conflicts list the referencing app clients when the BFF can read them.
- [x] Feature flag `VITE_PROVIDER_KEY_MANAGEMENT=false` hides mutating actions.

## Data and API

| Method | BFF path | Upstream |
|---|---|---|
| GET/POST | `/api/admin/providers` | `GET/POST /internal/admin/providers` |
| GET/PUT/DELETE | `/api/admin/providers/:id` | `GET/PUT/DELETE .../providers/:id` |
| POST | `/api/admin/providers/:id/check` | `POST .../check` |
| GET | `/api/admin/providers/:id/models` | `GET .../models` |
| PUT/DELETE | `/api/admin/providers/:id/models/:modelId` | `PUT/DELETE .../models/:modelId` |

Schemas: `shared/admin-api/providers.ts` (`providerSchema`, `providerCatalogModelSchema`,
`providerInputSchema`, `providerModelInputSchema`, `providerInUseDetailsSchema`) and
`credentialStateSchema` in `shared/admin-api/common.ts`.

## Security

- Never render or log a plaintext key; password fields only, no prefill.
- The BFF parses responses into schemas that have no key field, so accidental gateway fields
  are dropped before the browser sees them.
- `clearApiKey` is sent only from the remove confirmation.
- Actor is derived from the Access session by the BFF; provider audit remains gateway-side.

## Test notes

- BFF tests: create/update/model/delete forwarding, `display_name`/`api_key` mapping,
  clear-key behavior, no key in responses, 409/422/503 mapping.
- Unit tests: route/model config parsing and feature-flag behavior.
- Browser check: provider cards, detail tabs, key dialog, model dialog, health check.

## Traceability

[IA §4.5](../05-information-architecture.md) · [API §8.4–§8.5](../06-api-integration.md) ·
[FR-020](FR-020-provider-health-persistence.md)
