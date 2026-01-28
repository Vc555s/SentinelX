import { motion } from 'framer-motion';
import { Navigation, User, Clock, MapPin, Radio } from 'lucide-react';
import { usePatrolRoutes } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Patrols() {
  const { data: patrols = [] } = usePatrolRoutes();

  const statusColors = {
    active: 'bg-success/20 text-success border-success/30',
    paused: 'bg-warning/20 text-warning border-warning/30',
    completed: 'bg-muted/20 text-muted-foreground border-muted/30',
  };

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
            Patrol Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and coordinate active patrol units
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Radio className="w-4 h-4 mr-2" />
          Dispatch Unit
        </Button>
      </motion.header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-success/10">
              <Navigation className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-foreground">
                {patrols.filter(p => p.status === 'active').length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Active Patrols
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-warning/10">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-foreground">
                {patrols.filter(p => p.status === 'paused').length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                On Break
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-mono text-foreground">12</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Sectors Covered
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Patrol List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card"
      >
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Active Units
          </h3>
        </div>
        <div className="divide-y divide-border/30">
          {patrols.map((patrol, index) => (
            <motion.div
              key={patrol.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="p-4 flex items-center justify-between hover:bg-card/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-foreground" />
                  </div>
                  {patrol.status === 'active' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-card" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{patrol.name}</p>
                  <p className="text-sm text-muted-foreground">{patrol.officer}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Waypoints</p>
                  <p className="font-mono text-sm text-foreground">
                    {patrol.coordinates.length}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider border',
                    statusColors[patrol.status]
                  )}
                >
                  {patrol.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
