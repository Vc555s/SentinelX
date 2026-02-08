import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export const useIncidents = () => {
  return useQuery({
    queryKey: ['incidents'],
    queryFn: api.getIncidents,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useHotspots = () => {
  return useQuery({
    queryKey: ['hotspots'],
    queryFn: api.getHotspots,
    refetchInterval: 60000, // Refresh every minute
  });
};

export const usePatrolRoutes = () => {
  return useQuery({
    queryKey: ['patrolRoutes'],
    queryFn: api.getPatrolRoutes,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time tracking
  });
};

export const useTrends = () => {
  return useQuery({
    queryKey: ['trends'],
    queryFn: api.getTrends,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
};

export const useCrimeDistribution = () => {
  return useQuery({
    queryKey: ['crimeDistribution'],
    queryFn: api.getCrimeDistribution,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: api.getDashboardStats,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });
};
