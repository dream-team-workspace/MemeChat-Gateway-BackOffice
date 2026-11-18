# Copyable frontend patterns

These snippets are shaped like the current code. Change names, keep the structure.

## 1. API module

```ts
// src/features/providers/api/providers.api.ts
import {
  providerListSchema,
  providerSchema,
  type ProviderInput,
} from "@shared/admin-api";
import { apiRequest } from "@/platform/api";

function providerPath(id: string) {
  return "/api/admin/providers/" + encodeURIComponent(id);
}

export const providersApi = {
  list: () => apiRequest("/api/admin/providers", providerListSchema),
  get: (id: string) => apiRequest(providerPath(id), providerSchema),
  update: (id: string, input: ProviderInput) =>
    apiRequest(providerPath(id), providerSchema, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
};

export const providerKeys = {
  all: ["providers"] as const,
  detail: (id: string) => ["providers", id] as const,
};
```

`apiRequest` already: sets `Accept`, generates `X-Request-Id`, parses JSON, throws typed
`ApiError` on non-2xx, and Zod-parses the success body (contract mismatch becomes
`ApiError` with code `CONTRACT_MISMATCH`).

## 2. Queries

```ts
// src/features/providers/queries/providers.queries.ts
import { queryOptions } from "@tanstack/react-query";
import { providerKeys, providersApi } from "../api/providers.api";

export const providersQueryOptions = queryOptions({
  queryKey: providerKeys.all,
  queryFn: providersApi.list,
});

export const providerQueryOptions = (id: string) =>
  queryOptions({
    queryKey: providerKeys.detail(id),
    queryFn: () => providersApi.get(id),
  });
```

Usage in a page: `const providers = useQuery(providersQueryOptions);` then branch on
`isLoading` / `isError` / `data.items.length === 0` / data.

## 3. Mutations with precise invalidation

```ts
// src/features/providers/mutations/providers.mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { abilityKeys } from "@/features/abilities/api/abilities.api";
import { providerKeys, providersApi } from "../api/providers.api";

function useInvalidateProviders() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: providerKeys.all });
    if (id) void queryClient.invalidateQueries({ queryKey: providerKeys.detail(id) });
    void queryClient.invalidateQueries({ queryKey: abilityKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["app-clients"] });
  };
}

export function useCreateProvider() {
  const invalidate = useInvalidateProviders();
  return useMutation({
    mutationFn: (input: ProviderInput) => providersApi.create(input),
    onSuccess: (provider) => invalidate(provider.id),
  });
}
```

For a save whose response is the new authority (e.g. app-client routes), also
`queryClient.setQueryData(appClientKeys.detail(id), client)` before invalidating the prefix.

## 4. Container page

```tsx
export function ProvidersPage() {
  const providers = useQuery(providersQueryOptions);

  return (
    <div className="animate-in">
      <PageHeader eyebrow="Registry" title="Providers" description="…" />
      {providers.isLoading ? (
        <div className="mt-6"><LoadingRows rows={5} /></div>
      ) : providers.isError ? (
        <Card className="mt-6">
          <CardContent className="p-0">
            <ErrorState
              message={getErrorMessage(providers.error)}
              onRetry={() => void providers.refetch()}
            />
          </CardContent>
        </Card>
      ) : providers.data.items.length === 0 ? (
        <Card className="mt-6"><CardContent className="p-0"><EmptyState title="…" /></CardContent></Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {providers.data.items.map((p) => <ProviderCard key={p.id} provider={p} />)}
        </div>
      )}
    </div>
  );
}
```

Presentational components (`ProviderCard`, `RouteRow`) take data/callbacks and never fetch.

## 5. Dialog form (current common pattern)

```tsx
const [name, setName] = useState(provider?.displayName ?? "");
const [error, setError] = useState<string | null>(null);
const mutation = useUpdateProvider(provider?.id ?? "");

function submit() {
  setError(null);
  const parsed = providerInputSchema.safeParse({ displayName: name, /* … */ });
  if (!parsed.success) {
    setError(parsed.error.issues[0]?.message ?? "Check the form.");
    return;
  }
  mutation.mutate(parsed.data, {
    onSuccess: () => onOpenChange(false),
    onError: (err) => setError(getErrorMessage(err)),
  });
}
```

Render `<Dialog title=… open=… onOpenChange=… footer={…}>` with `FormField` per input and an
inline `role="alert"` error block. Keep the dialog open and inputs intact on failure.

## 6. RHF form (capability profile)

```tsx
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues,
});
// form.handleSubmit(onSubmit) with formState.errors / isSubmitting
```

The resolver is `src/lib/zod-resolver.ts` (custom, maps Zod issues to nested RHF errors).
`@hookform/resolvers` is not installed.

## 7. Route declaration

```tsx
const ProviderDetailPage = lazyRouteComponent(
  () => import("@/features/providers"),
  "ProviderDetailPage",
);

const providerDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/providers/$providerId",
  component: ProviderDetailPage,
});
```

Add the route to the `appRoute.addChildren([...])` tree. Lazy routes keep the shell small and
`defaultPreload: "intent"` preloads components/loaders on hover.

## 8. Pending gateway feature

```tsx
const missing = query.isError && isGatewayFeatureMissing(query.error);

return missing ? (
  <PendingGatewayState
    title="Activity is not available yet"
    description="The gateway has not shipped this endpoint."
  />
) : query.isError ? (
  <ErrorState message={getErrorMessage(query.error)} onRetry={() => void query.refetch()} />
) : ( /* table */ );
```

## 9. Unit-test sibling (pure logic)

```ts
// src/features/providers/lib/provider-status.test.ts
import { describe, expect, it } from "vitest";
import { providerStatusLabel } from "./provider-status";

describe("providerStatusLabel", () => {
  it("prefers the current check result over historical health", () => {
    expect(providerStatusLabel({ /* … */ })).toBe("healthy");
  });
});
```
