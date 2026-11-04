# FR-022 — Ability catalog and app-client routes

| Field | Value |
|---|---|
| Status | Implemented (gateway routing branch deployment pending) |
| Priority | Must |
| Phase | 2 |
| Owner | Frontend + gateway |
| Depends on | FR-002, FR-021; gateway migration 0009 |
| Source | Gateway working tree `docs/21-ability-provider-model-routing.md` §3, §7; [API §2.2](../06-api-integration.md) |

## Intent

Give the operator one mental model — Ability → Provider → Model — and let each app client
select exactly one provider/model per ability. The app still calls only the ability endpoint.

## Scope

In scope:

- `/abilities`: five-row catalog with kind, available providers, model counts, profiles.
- `/abilities/:abilityId`: providers/models (enabled state + cost) and legacy cost profiles.
- `/capabilities` redirects to `/abilities`; legacy profiles remain at
  `/capabilities/:capabilityId` for cost/limits, kill switch, and audit.
- App-client Access tab: five fixed ability rows, provider/model selects, Remove, Save routes.
- Legacy fallback: no `routes` field or rollout flag off → read-only capability matrix.
- Client list `n/5 abilities routed` and provider/model display names.

Out of scope:

- More than one route per ability (gateway enforces one).
- Editing provider credentials from the route editor.
- Per-route fallback chains.

## Behavior

1. Abilities are ordered `llm`, `tts`, `stt`, `embeddings`, `vector`. All five rows render,
   including unrouted ones.
2. Provider options are filtered by provider kind (defensively also by catalog models);
   model options by provider + ability + enabled. A currently selected disabled model stays
   visible with a warning.
3. Changing provider resets the model to the first enabled model; Remove clears the row.
4. Dirty state compares `{ability, providerId, modelId}` tuples. Save sends only complete
   rows to `PUT /api/admin/app-clients/:id/routes`; omitted abilities are unrouted.
5. A selected provider with `configured: false` shows an amber warning with a provider link;
   Save remains enabled because the operator may be preparing the route.
6. On success, replace the client query data with the response, reset baseline, show
   `Routes saved`. 422 highlights the affected row; 409 offers `Reload client`.
7. External route changes are detected by comparing route tuples, not `updatedAt`, so a
   metadata-only edit does not falsely block route saves.
8. Metadata edits preserve routes by sending them; the gateway treats a supplied set as
   authoritative.

## Acceptance criteria

- [x] `/abilities` lists the five abilities with available providers and model counts.
- [x] Ability detail lists provider/model availability and legacy cost profiles.
- [x] App-client Access shows all five abilities, including unrouted rows.
- [x] Provider/model selection is filtered; invalid combinations cannot be submitted.
- [x] Save sends only complete enabled routes and removes omitted rows.
- [x] Dirty state resets after save; Discard restores the baseline.
- [x] Missing provider key warns but does not block Save.
- [x] Older gateways without `routes` show the read-only legacy banner.
- [x] Rollout flag `VITE_ABILITY_ROUTES=false` disables the editor.
- [x] Client list shows routed count.

## Data and API

| Method | BFF path | Upstream |
|---|---|---|
| GET | `/api/admin/abilities` | `GET /internal/admin/abilities` |
| PUT | `/api/admin/app-clients/:id/routes` | `PUT .../app-clients/:id/routes` |

Route input: `{ability, providerId, modelId, enabled}`; BFF maps to `provider_id`/`model_id`.
Response: updated `AppClient` with five route rows and the mirrored legacy matrix.

Schemas: `shared/admin-api/abilities.ts`, `shared/admin-api/app-clients.ts`.

## Errors and edge cases

| Case | UI |
|---|---|
| Provider key missing | Amber row warning; Save allowed |
| Provider disabled | Detail shows Disabled; route warning where known |
| Provider has no models | “Add a model before routing this ability” + link |
| Model disabled | Excluded from new selections; existing value stays with warning |
| 422 | Keep editor state; map message to the ability row when it names one |
| 409 | Show conflict; offer Reload client |
| Client deleted elsewhere | 404 on save; return to the list |
| Older gateway | Read-only legacy matrix banner |

## Test notes

- Unit: `toRouteDraft`, `routeInputs`, `routesEqual`, `firstIncomplete`, metadata preservation.
- BFF: abilities proxy; routes PUT forwarding and camelization; 422/409 mapping.
- Browser: five rows, provider reset, missing-key warning, save, reload, legacy fallback.

## Traceability

[IA §4.3–§4.5.1](../05-information-architecture.md) · [API §8.6](../06-api-integration.md) ·
[FR-019](FR-019-app-client-access-and-audit.md)
