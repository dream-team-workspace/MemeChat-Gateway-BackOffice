import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isUsableDateInput, todayDateInput } from "@/lib/activity-date";

/**
 * Native date input for the file-backed activity logs. The input keeps a local
 * draft while the user types so partial dates never hit the API; only complete,
 * current-era dates are committed (after a short debounce).
 */
export function ActivityDateFilter({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const today = todayDateInput();
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const timer = useRef<number | undefined>(undefined);

  // Keep the draft aligned with an externally changed value (for example the
  // Today button or a reset) without a setState-in-effect cascade.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  useEffect(() => {
    return () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    };
  }, []);

  function commit(next: string, immediate = false) {
    if (!isUsableDateInput(next)) return;
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    if (immediate) {
      onChange(next);
      return;
    }
    timer.current = window.setTimeout(() => onChange(next), 250);
  }

  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={id} className="sr-only">
        Activity date
      </label>
      <Input
        id={id}
        type="date"
        value={draft}
        min="2000-01-01"
        max={today}
        disabled={disabled}
        aria-label="Activity date"
        onChange={(event) => {
          const next = event.target.value || today;
          setDraft(next);
          commit(next);
        }}
        onBlur={() => {
          if (isUsableDateInput(draft)) {
            commit(draft, true);
          } else {
            setDraft(value);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft, true);
          }
        }}
        className="h-8 w-[9.75rem] text-xs"
      />
      {value !== today ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(today);
            commit(today, true);
          }}
          disabled={disabled}
        >
          Today
        </Button>
      ) : null}
    </div>
  );
}