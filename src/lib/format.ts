import type { Capability } from "@shared/admin-api";

const numberFormat = new Intl.NumberFormat();

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatNumber(value: number) {
  return numberFormat.format(value);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

export function formatCost(capability: Capability) {
  return (
    formatNumber(capability.costCredits) +
    " CRD / " +
    formatNumber(capability.costPer) +
    " " +
    capability.costUnit
  );
}

export function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}
