import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

type FormFieldProps = {
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ htmlFor, label, hint, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={htmlFor + "-error"} role="alert" className="text-[11px] font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor + "-hint"} className="text-[11px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
