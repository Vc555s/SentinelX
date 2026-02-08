import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, MapPin, X, CheckCircle2, Truck, Clock, Navigation, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SOSAlert {
    id: string;
    latitude: number;
    longitude: number;
    address: string;
    message: string;
    timestamp: string;
    read: boolean;
    priority: string;
    dispatch_status: string;
    dispatch_unit: string | null;
    dispatch_unit_name: string | null;
    dispatch_time: string | null;
    eta_minutes: number | null;
    patrol_lat: number | null;
    patrol_lng: number | null;
}

interface AlertFeedProps {
    onViewOnMap?: (coordinates: [number, number], patrolCoords?: [number, number]) => void;
}

const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'critical': return 'border-l-red-500 bg-red-500/10';
        case 'high': return 'border-l-orange-500 bg-orange-500/10';
        case 'medium': return 'border-l-yellow-500 bg-yellow-500/10';
        case 'low': return 'border-l-blue-500 bg-blue-500/10';
        default: return 'border-l-gray-500 bg-gray-500/10';
    }
};

const getPriorityBadge = (priority: string) => {
    switch (priority) {
        case 'critical': return 'bg-red-600 text-white';
        case 'high': return 'bg-orange-600 text-white';
        case 'medium': return 'bg-yellow-500 text-black';
        case 'low': return 'bg-blue-500 text-white';
        default: return 'bg-gray-500 text-white';
    }
};

const getDispatchStatusStyle = (status: string) => {
    switch (status) {
        case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        case 'dispatched': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
        case 'en_route': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
        case 'arrived': return 'bg-green-500/20 text-green-400 border-green-500/50';
        case 'resolved': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
};

const getDispatchStatusLabel = (status: string) => {
    switch (status) {
        case 'pending': return '⏳ Pending';
        case 'dispatched': return '🚔 Dispatched';
        case 'en_route': return '🚨 En Route';
        case 'arrived': return '✅ Arrived';
        case 'resolved': return '✓ Resolved';
        default: return status;
    }
};

export function AlertFeed({ onViewOnMap }: AlertFeedProps) {
    const [alerts, setAlerts] = useState<SOSAlert[]>([]);
    const [dispatching, setDispatching] = useState<string | null>(null);

    // Poll backend API for SOS alerts every 2 seconds
    useEffect(() => {
        const loadAlerts = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/sos/alerts`);
                if (response.ok) {
                    const data = await response.json();
                    setAlerts(data);
                }
            } catch (error) {
                console.error('Failed to fetch SOS alerts:', error);
            }
        };

        loadAlerts();
        const interval = setInterval(loadAlerts, 2000);
        return () => clearInterval(interval);
    }, []);

    const sortedAlerts = [...alerts].sort((a, b) => {
        // Unread first
        if (a.read !== b.read) return a.read ? 1 : -1;
        // Then by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
        if (aPriority !== bPriority) return aPriority - bPriority;
        // Then by timestamp (newest first)
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    const handleMarkAsRead = async (alertId: string) => {
        try {
            await fetch(`${API_BASE_URL}/sos/alerts/${alertId}/read`, { method: 'PUT' });
            setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
        } catch (error) {
            console.error('Failed to mark alert as read:', error);
        }
    };

    const handleDismiss = async (alertId: string) => {
        try {
            await fetch(`${API_BASE_URL}/sos/alerts/${alertId}`, { method: 'DELETE' });
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (error) {
            console.error('Failed to dismiss alert:', error);
        }
    };

    const handleDispatch = async (alertId: string) => {
        setDispatching(alertId);
        try {
            const response = await fetch(`${API_BASE_URL}/sos/alerts/${alertId}/dispatch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            if (response.ok) {
                const data = await response.json();
                setAlerts(prev => prev.map(a =>
                    a.id === alertId
                        ? { ...a, dispatch_status: 'dispatched', dispatch_unit_name: data.unit, eta_minutes: data.eta_minutes }
                        : a
                ));
            }
        } catch (error) {
            console.error('Failed to dispatch patrol:', error);
        } finally {
            setDispatching(null);
        }
    };

    const handleResolve = async (alertId: string) => {
        try {
            await fetch(`${API_BASE_URL}/sos/alerts/${alertId}/status?status=resolved`, { method: 'PUT' });
            setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, dispatch_status: 'resolved' } : a));
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    const handleViewOnMap = (alert: SOSAlert) => {
        if (alert.latitude && alert.longitude && onViewOnMap) {
            handleMarkAsRead(alert.id);
            const patrolCoords = alert.patrol_lat && alert.patrol_lng
                ? [alert.patrol_lat, alert.patrol_lng] as [number, number]
                : undefined;
            onViewOnMap([alert.latitude, alert.longitude], patrolCoords);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="glass-card overflow-hidden h-full flex flex-col"
        >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        Live Alerts
                    </h3>
                    {alerts.filter(a => !a.read).length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full animate-pulse">
                            {alerts.filter(a => !a.read).length}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-3 max-h-[500px]">
                {sortedAlerts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                        No alerts at the moment
                    </div>
                ) : (
                    sortedAlerts.map(alert => (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-3 rounded-lg border-l-4 ${getPriorityColor(alert.priority)} ${alert.read ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${getPriorityBadge(alert.priority)}`}>
                                            {alert.priority}
                                        </span>
                                        {alert.id.includes('SOS') && (
                                            <span className="text-lg animate-pulse">🚨</span>
                                        )}
                                        {/* Dispatch Status Badge */}
                                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${getDispatchStatusStyle(alert.dispatch_status)}`}>
                                            {getDispatchStatusLabel(alert.dispatch_status)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground line-clamp-2">{alert.message}</p>
                                    {alert.address && (
                                        <p className="text-xs text-muted-foreground mt-1 truncate">
                                            📍 {alert.address}
                                        </p>
                                    )}

                                    {/* Dispatch Info */}
                                    {alert.dispatch_unit_name && (
                                        <div className="mt-2 p-2 rounded bg-black/20 text-xs space-y-1">
                                            <div className="flex items-center gap-1 text-blue-400">
                                                <Truck className="w-3 h-3" />
                                                <span className="font-medium">{alert.dispatch_unit_name}</span>
                                            </div>
                                            {alert.eta_minutes !== null && alert.dispatch_status !== 'arrived' && alert.dispatch_status !== 'resolved' && (
                                                <div className="flex items-center gap-1 text-yellow-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>ETA: {alert.eta_minutes} min</span>
                                                </div>
                                            )}
                                            {alert.dispatch_status === 'en_route' && (
                                                <div className="flex items-center gap-1 text-purple-400 animate-pulse">
                                                    <Navigation className="w-3 h-3" />
                                                    <span>Patrol en route...</span>
                                                </div>
                                            )}
                                            {alert.dispatch_status === 'arrived' && (
                                                <div className="flex items-center gap-1 text-green-400">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    <span>Patrol on scene</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    {/* Dispatch Button */}
                                    {alert.dispatch_status === 'pending' && (
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
                                            onClick={() => handleDispatch(alert.id)}
                                            disabled={dispatching === alert.id}
                                        >
                                            <Radio className="w-3 h-3" />
                                            {dispatching === alert.id ? '...' : 'Dispatch'}
                                        </Button>
                                    )}

                                    {/* Resolve Button */}
                                    {alert.dispatch_status === 'arrived' && (
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
                                            onClick={() => handleResolve(alert.id)}
                                        >
                                            <CheckCircle2 className="w-3 h-3" />
                                            Resolve
                                        </Button>
                                    )}

                                    {/* View on Map */}
                                    {alert.latitude && alert.longitude && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-primary/50 hover:bg-primary/10"
                                            onClick={() => handleViewOnMap(alert)}
                                        >
                                            <MapPin className="w-3 h-3" />
                                            View
                                        </Button>
                                    )}
                                    {!alert.read && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs gap-1"
                                            onClick={() => handleMarkAsRead(alert.id)}
                                        >
                                            <CheckCircle2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDismiss(alert.id)}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </motion.div>
    );
}
