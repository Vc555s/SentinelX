import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useTrends } from '@/hooks/useApi';

export function CrimeChart() {
  const { data: trends, isLoading } = useTrends();

  const chartData = trends?.slice(-14).map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card p-5 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Incident Trends
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-primary rounded-full" />
            <span className="text-muted-foreground">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-accent rounded-full opacity-50" style={{ 
              backgroundImage: 'repeating-linear-gradient(90deg, hsl(var(--accent)) 0, hsl(var(--accent)) 4px, transparent 4px, transparent 8px)' 
            }} />
            <span className="text-muted-foreground">Predicted</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[200px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 20%)" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 8%)',
                  border: '1px solid hsl(217, 33%, 20%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
                }}
                labelStyle={{ color: 'hsl(210, 40%, 98%)', fontWeight: 500 }}
                itemStyle={{ color: 'hsl(215, 20%, 65%)' }}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                fill="url(#colorActual)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(217, 91%, 60%)' }}
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="hsl(192, 91%, 50%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#colorPredicted)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(192, 91%, 50%)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
