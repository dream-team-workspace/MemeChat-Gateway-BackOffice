import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { AppLayout } from "@/app/layouts/app-layout";
import { RootLayout } from "@/app/layouts/root-layout";
import { NotFoundPage } from "@/app/not-found-page";
import {
  CapabilitiesPage,
  CapabilityAuditPage,
  CapabilityDetailLayout,
  CapabilityOverviewPage,
  CapabilityRoutingPage,
} from "@/features/capabilities";
import { ModelsPage } from "@/features/models";
import { OperationsPage } from "@/features/operations";
import { OverviewPage } from "@/features/overview";
import { SettingsPage } from "@/features/settings";
import {
  UserDetailLayout,
  UserLedgerPage,
  UsersPage,
  UserUsagePage,
} from "@/features/users";
import { ensureSession } from "@/platform/auth/auth-store";
import { LoginPage } from "@/platform/auth/pages/login-page";

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
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
});

const overviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: OverviewPage,
});

const capabilitiesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/capabilities",
  component: CapabilitiesPage,
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
  component: CapabilityRoutingPage,
});

const capabilityAuditRoute = createRoute({
  getParentRoute: () => capabilityRoute,
  path: "audit",
  component: CapabilityAuditPage,
});

const modelsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/models",
  component: ModelsPage,
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
    capabilitiesRoute,
    capabilityRoute.addChildren([
      capabilityOverviewRoute,
      capabilityRoutingRoute,
      capabilityAuditRoute,
    ]),
    modelsRoute,
    usersRoute,
    userRoute.addChildren([
      userIndexRoute,
      userLedgerRoute,
      userUsageRoute,
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
