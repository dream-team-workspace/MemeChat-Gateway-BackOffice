import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useSession } from "@/features/auth/auth-store";

export function AppLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobilePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) void navigate({ to: "/login" });
  }, [session, navigate]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const getFocusable = () => {
      const panel = mobilePanelRef.current;
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
    };

    const closeButton = mobilePanelRef.current?.querySelector<HTMLElement>(
      '[aria-label="Close navigation"]',
    );
    (closeButton ?? getFocusable()[0])?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      const trigger = document.querySelector<HTMLElement>(
        '[aria-label="Open navigation"]',
      );
      (trigger ?? previouslyFocused)?.focus();
    };
  }, [mobileOpen]);

  if (!session) return null;

  return (
    <div className="min-h-dvh bg-background">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[264px] lg:flex-col lg:border-r lg:border-sidebar-border">
        <AppSidebar />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50 animate-fade"
            onClick={() => setMobileOpen(false)}
          />
          <div
            ref={mobilePanelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative h-full w-[min(86vw,320px)] border-r border-sidebar-border bg-sidebar animate-in"
          >
            <AppSidebar
              mobile
              onClose={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div
        aria-hidden={mobileOpen ? "true" : undefined}
        className="lg:pl-[264px]"
      >
        <Topbar onMenuOpen={() => setMobileOpen(true)} />
        <main
          id="main"
          className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
