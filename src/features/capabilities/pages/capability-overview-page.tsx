import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";

import { ErrorState, LoadingRows } from "@/components/common/async-state";
import { Card, CardContent } from "@/components/ui/card";
import { capabilityQueryOptions } from "@/features/capabilities/queries/capabilities.queries";
import { CapabilityConfigurationForm } from "@/features/capabilities/components/capability-configuration-form";
import { getErrorMessage } from "@/platform/api";

export function CapabilityOverviewPage() {
  const { capabilityId } = useParams({ from: "/app/capabilities/$capabilityId" });
  const { data, isLoading, isError, error, refetch } = useQuery(
    capabilityQueryOptions(capabilityId),
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <LoadingRows rows={5} />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
        </CardContent>
      </Card>
    );
  }

  return (
    <CapabilityConfigurationForm
      key={data.id}
      capability={data}
    />
  );
}
