import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Siren,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Activity {
  id: string;
  type: 'alert' | 'resolved' | 'pending' | 'patrol';
  message: string;
  location: string;
  time: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'alert',
    message: 'Theft reported at convenience store',
    location: 'Sector 4, Block C',
    time: '2 min ago',
    severity: 'high',
  },
  {
    id: '2',
    type: 'patrol',
    message: 'Alpha Unit responding to call',
    location: 'Sector 4, Block C',
    time: '3 min ago',
  },
  {
    id: '3',
    type: 'resolved',
    message: 'Vandalism case closed',
    location: 'Sector 7, Main St',
    time: '15 min ago',
  },
  {
    id: '4',
    type: 'alert',
    message: 'Suspicious activity detected',
    location: 'Sector 2, Park Ave',
    time: '22 min ago',
    severity: 'medium',
  },
  {
    id: '5',
    type: 'pending',
    message: 'Noise complaint under review',
    location: 'Sector 9, Oak Lane',
    time: '35 min ago',
  },
  {
    id: '6',
    type: 'resolved',
    message: 'Traffic incident cleared',
    location: 'Sector 1, Highway 7',
    time: '45 min ago',
  },
  {
    id: '7',
    type: 'alert',
    message: 'Breaking and entering attempt',
    location: 'Sector 5, Industrial Zone',
    time: '1 hour ago',
    severity: 'critical',
  },
  {
    id: '8',
    type: 'patrol',
    message: 'Bravo Unit shift started',
    location: 'Sector 3',
    time: '1 hour ago',
  },
];

const typeConfig = {
  alert: {
    icon: Siren,
    iconClass: 'text-danger',
    bgClass: 'bg-danger/10',
  },
  resolved: {
    icon: CheckCircle2,
    iconClass: 'text-success',
    bgClass: 'bg-success/10',
  },
  pending: {
    icon: Clock,
    iconClass: 'text-warning',
    bgClass: 'bg-warning/10',
  },
  patrol: {
    icon: MapPin,
    iconClass: 'text-primary',
    bgClass: 'bg-primary/10',
  },
};

const severityColors = {
  low: 'border-l-success',
  medium: 'border-l-warning',
  high: 'border-l-danger',
  critical: 'border-l-danger animate-pulse',
};

export function ActivityFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card h-full flex flex-col"
    >
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Recent Activity
          </h3>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {mockActivities.map((activity, index) => {
            const config = typeConfig[activity.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  'p-3 rounded-lg bg-card/30 border-l-2 hover:bg-card/50 transition-colors cursor-pointer group',
                  activity.severity
                    ? severityColors[activity.severity]
                    : 'border-l-muted'
                )}
              >
                <div className="flex gap-3">
                  <div className={cn('p-1.5 rounded-lg', config.bgClass)}>
                    <Icon className={cn('w-4 h-4', config.iconClass)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">
                        {activity.location}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
