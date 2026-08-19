import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '@/modules/dashboard/api';

export function useDashboardSummary(instanceKey: string) {
  return useQuery({
    queryKey: ['tenant-dashboard-summary', instanceKey],
    queryFn: () => getDashboardSummary(instanceKey),
  });
}
