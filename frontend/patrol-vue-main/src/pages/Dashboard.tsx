import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  Users,
  CheckCircle2,
  Bell,
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { MiniMap } from '@/components/dashboard/MiniMap';
import { CrimeChart } from '@/components/dashboard/CrimeChart';
import { useDashboardStats } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring and predictive analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-[10px] font-bold text-danger-foreground rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          <div className="h-8 w-px bg-border" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Last updated</p>
            <p className="text-sm font-mono text-foreground">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </motion.header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Incidents (24h)"
          value={stats?.totalIncidents24h ?? 0}
          change={stats?.incidentChange ?? 0}
          icon={AlertTriangle}
          variant={stats?.incidentChange && stats.incidentChange < 0 ? 'success' : 'danger'}
          delay={0}
        />
        <KPICard
          title="High Alert Zones"
          value={stats?.highAlertZones ?? 0}
          change={stats?.alertChange ?? 0}
          icon={Shield}
          variant="danger"
          delay={0.1}
        />
        <KPICard
          title="Patrols Active"
          value={stats?.patrolsActive ?? 0}
          change={stats?.patrolChange ?? 0}
          icon={Users}
          variant="default"
          delay={0.2}
        />
        <KPICard
          title="Resolution Rate"
          value={`${stats?.resolutionRate ?? 0}%`}
          change={stats?.resolutionChange ?? 0}
          icon={CheckCircle2}
          variant="success"
          delay={0.3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart and Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mini Map */}
          <div className="h-[300px]">
            <MiniMap />
          </div>

          {/* Crime Trend Chart */}
          <div className="h-[320px]">
            <CrimeChart />
          </div>
        </div>

        {/* Right Column - Activity Feed */}
        <div className="h-[640px]">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
