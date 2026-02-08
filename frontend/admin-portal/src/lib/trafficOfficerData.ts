// Traffic Officer Data Management - SOS Feature Support
// This module provides data structures for alerts and incidents with localStorage persistence

export interface Incident {
    id: string;
    type: 'accident' | 'breakdown' | 'road-closure' | 'event' | 'hazard' | 'congestion' | 'sos';
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'reported' | 'assigned' | 'in-progress' | 'resolved' | 'closed';
    location: {
        coordinates: [number, number];
        address: string;
        landmark: string;
    };
    reportedBy: string;
    reportedAt: string;
    assignedOfficers: string[];
    description: string;
    timeline: {
        reported: string;
        assigned?: string;
        arrived?: string;
        resolved?: string;
    };
    affectedLanes: number;
    estimatedClearanceTime?: string;
    notes: string[];
}

export interface Alert {
    id: string;
    type: 'violation' | 'incident' | 'system' | 'weather' | 'congestion';
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    location?: string;
    coordinates?: [number, number];
    timestamp: string;
    read: boolean;
}

// LocalStorage Management for cross-portal communication
export const TrafficDataStore = {
    saveIncidents: (incidents: Incident[]) => {
        localStorage.setItem('traffic_incidents', JSON.stringify(incidents));
    },

    loadIncidents: (): Incident[] => {
        const data = localStorage.getItem('traffic_incidents');
        return data ? JSON.parse(data) : [];
    },

    saveAlerts: (alerts: Alert[]) => {
        localStorage.setItem('traffic_alerts', JSON.stringify(alerts));
    },

    loadAlerts: (): Alert[] => {
        const data = localStorage.getItem('traffic_alerts');
        return data ? JSON.parse(data) : [];
    },

    addIncident: (incident: Incident) => {
        const incidents = TrafficDataStore.loadIncidents();
        TrafficDataStore.saveIncidents([incident, ...incidents]);
    },

    addAlert: (alert: Alert) => {
        const alerts = TrafficDataStore.loadAlerts();
        TrafficDataStore.saveAlerts([alert, ...alerts]);
    },

    markAlertAsRead: (alertId: string) => {
        const alerts = TrafficDataStore.loadAlerts();
        const updated = alerts.map(a => a.id === alertId ? { ...a, read: true } : a);
        TrafficDataStore.saveAlerts(updated);
    },

    dismissAlert: (alertId: string) => {
        const alerts = TrafficDataStore.loadAlerts();
        const updated = alerts.filter(a => a.id !== alertId);
        TrafficDataStore.saveAlerts(updated);
    }
};
