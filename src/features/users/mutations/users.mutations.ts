import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CreditGrantInput } from "@shared/admin-api";

import { userKeys, usersApi } from "../api/users.api";

export function useGrantCredits(uid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreditGrantInput) => usersApi.grant(uid, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.ledgerPrefix(uid) });
    },
  });
}
