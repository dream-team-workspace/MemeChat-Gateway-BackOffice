/* eslint-disable react-refresh/only-export-components -- compound component API */
import {
  createContext,
  use,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = use(TabsContext);
  if (!context) throw new Error("Tabs components must be used inside Tabs.Root");
  return context;
}

function TabsRoot({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const baseId = useId();
  return (
    <TabsContext value={{ value, onValueChange, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext>
  );
}

function TabsList({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const { onValueChange } = useTabsContext();

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const current = tabs.findIndex((tab) => tab === document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    const target = tabs[next];
    if (!target) return;
    onValueChange(target.dataset.value ?? "");
    target.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("flex gap-1", className)}
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const context = useTabsContext();
  const selected = context.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={context.baseId + "-tab-" + value}
      aria-controls={context.baseId + "-panel-" + value}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      data-value={value}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function TabsPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const context = useTabsContext();
  if (context.value !== value) return null;
  return (
    <div
      role="tabpanel"
      id={context.baseId + "-panel-" + value}
      aria-labelledby={context.baseId + "-tab-" + value}
      className={className}
    >
      {children}
    </div>
  );
}

/** Compound tabs: shared context, explicit slots, keyboard navigation. */
export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
};
