import type { AbilityId } from "@shared/admin-api";

import { ApiError } from "@/platform/api";
import type { RouteDraft } from "@/features/app-clients/hooks/use-route-draft";

/**
 * Maps a gateway 422 back to the row that caused it. The gateway reports the
 * issue by route index and by ability name; either signal is enough.
 */
export function routeErrorAbility(
  error: unknown,
  draft: RouteDraft[],
): AbilityId | null {
  if (!(error instanceof ApiError)) return null;

  const issues = error.details?.issues;
  if (Array.isArray(issues)) {
    for (const issue of issues) {
      if (!issue || typeof issue !== "object") continue;
      const path = (issue as { path?: unknown }).path;
      if (typeof path !== "string") continue;
      const match = /(?:^|\.)routes\.(\d+)\./.exec(path);
      if (match) {
        const row = draft[Number(match[1])];
        if (row) return row.ability;
      }
    }
  }

  const message = error.message.toLowerCase();
  return draft.find((row) => message.includes(row.ability))?.ability ?? null;
}
