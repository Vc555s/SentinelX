import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, PieChartIcon, BarChart3, Activity } from 'lucide-react';
import { useTrends, useCrimeDistribution } from '@/hooks/useApi';

const COLORS = ['#3b82f6', '#ef4444', '#8b5cf6', '#f59e0b', '#f97316', '#6b7280'];

export default function Analytics() {
  const { data: trends } = useTrends();
  const { data: distribution } = useCrimeDistribution();

  const chartData = trends?.slice(-30).map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  const radarData = distribution?.map((item) => ({
    subject: item.type,
    A: item.count,
    fullMark: 150,
  }));

  // Time-based crime distribution (mock)
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    incidents: Math.floor(10 + Math.sin(((i - 6) / 24) * Math.PI * 2) * 15 + Math.random() * 8),
  }));

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground">
          Analytics & Predictions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historical data analysis and predictive modeling
        </p>
      </motion.header>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Prediction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Crime Trend Prediction
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActualAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPredictedAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 8%)',
                    border: '1px solid hsl(217, 33%, 20%)',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2}
                  fill="url(#colorActualAnalytics)"
                />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  stroke="hsl(192, 91%, 50%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#colorPredictedAnalytics)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-primary rounded" />
              <span className="text-muted-foreground">Historical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-accent rounded opacity-50" style={{
                backgroundImage: 'repeating-linear-gradient(90deg, hsl(192, 91%, 50%) 0, hsl(192, 91%, 50%) 4px, transparent 4px, transparent 8px)'
              }} />
              <span className="text-muted-foreground">Predicted</span>
            </div>
          </div>
        </motion.div>

        {/* Crime Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Crime Distribution
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={60}
                  paddingAngle={2}
                  label={({ type, percentage }) => `${type} ${percentage}%`}
                  labelLine={{ stroke: 'hsl(215, 20%, 55%)', strokeWidth: 1 }}
                >
                  {distribution?.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="hsl(222, 47%, 5%)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 8%)',
                    border: '1px solid hsl(217, 33%, 20%)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Radar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Crime Type Radar
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(217, 33%, 20%)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name="Incidents"
                  dataKey="A"
                  stroke="hsl(217, 91%, 60%)"
                  fill="hsl(217, 91%, 60%)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 8%)',
                    border: '1px solid hsl(217, 33%, 20%)',
                    borderRadius: '8px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Hourly Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Incidents by Hour
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" />
                <XAxis
                  dataKey="hour"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 9 }}
                  interval={2}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 8%)',
                    border: '1px solid hsl(217, 33%, 20%)',
                    borderRadius: '8px',
                  }}
                  cursor={{ fill: 'hsl(217, 33%, 17%)' }}
                />
                <Bar dataKey="incidents" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
