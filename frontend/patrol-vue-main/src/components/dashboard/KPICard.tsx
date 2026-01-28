import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  delay?: number;
}

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  variant = 'default',
  delay = 0,
}: KPICardProps) {
  const isPositive = change >= 0;
  const isNeutral = variant === 'default';

  const variantStyles = {
    default: {
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      glow: 'glow-primary',
    },
    success: {
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      glow: 'glow-success',
    },
    warning: {
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      glow: 'glow-warning',
    },
    danger: {
      iconBg: 'bg-danger/10',
      iconColor: 'text-danger',
      glow: 'glow-danger',
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-5 group hover:bg-card/60 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-data text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            <div
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                isPositive ? 'text-success' : 'text-danger'
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(change)}%</span>
            </div>
          </div>
        </div>
        <div
          className={cn(
            'p-3 rounded-xl transition-all duration-300',
            styles.iconBg,
            'group-hover:scale-110'
          )}
        >
          <Icon className={cn('w-6 h-6', styles.iconColor)} />
        </div>
      </div>

      {/* Sparkline placeholder */}
      <div className="mt-4 h-8 flex items-end gap-0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${20 + Math.random() * 80}%` }}
            transition={{ duration: 0.5, delay: delay + i * 0.05 }}
            className={cn(
              'flex-1 rounded-t',
              i === 11 ? styles.iconBg.replace('/10', '/50') : 'bg-muted/50'
            )}
          />
        ))}
      </div>
    </motion.div>
  );
}
