import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { AppLayout } from "@/app/layouts/app-layout";
import { RootLayout } from "@/app/layouts/root-layout";
import { NotFoundPage } from "@/app/not-found-page";
import { LoginPage } from "@/features/auth/pages/login-page";
import { CapabilitiesPage } from "@/features/capabilities/pages/capabilities-page";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { ModelsPage } from "@/features/models/pages/models-page";
import { OperationsPage } from "@/features/operations/pages/operations-page";
import { SettingsPage } from "@/features/settings/pages/settings-page";
import { UsersPage } from "@/features/users/pages/users-page";
import { ensureSession } from "@/features/auth/auth-store";

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: async () => {
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

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: DashboardPage,
});

const capabilitiesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/capabilities",
  component: CapabilitiesPage,
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
    dashboardRoute,
    capabilitiesRoute,
    modelsRoute,
    usersRoute,
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
