import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";

import { AppLayout } from "@/app/layouts/app-layout";
import { RootLayout } from "@/app/layouts/root-layout";
import { NotFoundPage } from "@/app/not-found-page";
import { RouteError } from "@/app/route-error";
import { ensureSession } from "@/platform/auth/auth-store";

// Route-level code splitting: the shell stays in the initial bundle; each
// product domain loads on navigation.
const LoginPage = lazyRouteComponent(
  () => import("@/platform/auth/pages/login-page"),
  "LoginPage",
);
const OverviewPage = lazyRouteComponent(
  () => import("@/features/overview"),
  "OverviewPage",
);
const AbilitiesPage = lazyRouteComponent(
  () => import("@/features/abilities"),
  "AbilitiesPage",
);
const AbilityDetailPage = lazyRouteComponent(
  () => import("@/features/abilities"),
  "AbilityDetailPage",
);
const CapabilityDetailLayout = lazyRouteComponent(
  () => import("@/features/capabilities"),
  "CapabilityDetailLayout",
);
const CapabilityOverviewPage = lazyRouteComponent(
  () => import("@/features/capabilities"),
  "CapabilityOverviewPage",
);
const CapabilityAuditPage = lazyRouteComponent(
  () => import("@/features/capabilities"),
  "CapabilityAuditPage",
);
const AppClientsPage = lazyRouteComponent(
  () => import("@/features/app-clients"),
  "AppClientsPage",
);
const AppClientDetailPage = lazyRouteComponent(
  () => import("@/features/app-clients"),
  "AppClientDetailPage",
);
const ModelsPage = lazyRouteComponent(
  () => import("@/features/models"),
  "ModelsPage",
);
const ProvidersPage = lazyRouteComponent(
  () => import("@/features/providers"),
  "ProvidersPage",
);
const ProviderDetailPage = lazyRouteComponent(
  () => import("@/features/providers"),
  "ProviderDetailPage",
);
const UsersPage = lazyRouteComponent(
  () => import("@/features/users"),
  "UsersPage",
);
const UserDetailLayout = lazyRouteComponent(
  () => import("@/features/users"),
  "UserDetailLayout",
);
const UserLedgerPage = lazyRouteComponent(
  () => import("@/features/users"),
  "UserLedgerPage",
);
const UserUsagePage = lazyRouteComponent(
  () => import("@/features/users"),
  "UserUsagePage",
);
const UserActivityPage = lazyRouteComponent(
  () => import("@/features/users"),
  "UserActivityPage",
);
const OperationsPage = lazyRouteComponent(
  () => import("@/features/operations"),
  "OperationsPage",
);
const SettingsPage = lazyRouteComponent(
  () => import("@/features/settings"),
  "SettingsPage",
);

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteError,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async () => {
    // Production: Access already authenticated the visitor, so skip the
    // fallback page. Development has no Access in front of localhost; keep
    // /login reachable so sign-out and the Access fallback can be reviewed.
    if (import.meta.env.DEV) return;
    if (await ensureSession()) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: async () => {
    if (!(await ensureSession())) throw redirect({ to: "/login" });
  },
  component: AppLayout,
  errorComponent: RouteError,
});

const overviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: OverviewPage,
});

const abilitiesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/abilities",
  component: AbilitiesPage,
});

const abilityRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/abilities/$abilityId",
  component: AbilityDetailPage,
});

const capabilitiesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/capabilities",
  beforeLoad: () => {
    throw redirect({ to: "/abilities" });
  },
});

const capabilityRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/capabilities/$capabilityId",
  component: CapabilityDetailLayout,
});

const capabilityOverviewRoute = createRoute({
  getParentRoute: () => capabilityRoute,
  path: "/",
  component: CapabilityOverviewPage,
});

const capabilityRoutingRoute = createRoute({
  getParentRoute: () => capabilityRoute,
  path: "routing",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/capabilities/$capabilityId",
      params: { capabilityId: params.capabilityId },
    });
  },
});

const capabilityAuditRoute = createRoute({
  getParentRoute: () => capabilityRoute,
  path: "audit",
  component: CapabilityAuditPage,
});

const appClientsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/app-clients",
  component: AppClientsPage,
});

const appClientRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/app-clients/$clientId",
  component: AppClientDetailPage,
});

const modelsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/models",
  component: ModelsPage,
});

const providersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/providers",
  component: ProvidersPage,
});

const providerDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/providers/$providerId",
  component: ProviderDetailPage,
});

const usersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/users",
  component: UsersPage,
});

const userRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/users/$uid",
  component: UserDetailLayout,
});

const userIndexRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/users/$uid/ledger",
      params: { uid: params.uid },
    });
  },
});

const userLedgerRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "ledger",
  component: UserLedgerPage,
});

const userUsageRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "usage",
  component: UserUsagePage,
});

const userActivityRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "activity",
  component: UserActivityPage,
});

const operationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/operations",
  component: OperationsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    overviewRoute,
    abilitiesRoute,
    abilityRoute,
    capabilitiesRoute,
    capabilityRoute.addChildren([
      capabilityOverviewRoute,
      capabilityRoutingRoute,
      capabilityAuditRoute,
    ]),
    appClientsRoute,
    appClientRoute,
    modelsRoute,
    providersRoute,
    providerDetailRoute,
    usersRoute,
    userRoute.addChildren([
      userIndexRoute,
      userLedgerRoute,
      userUsageRoute,
      userActivityRoute,
    ]),
    operationsRoute,
    settingsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
