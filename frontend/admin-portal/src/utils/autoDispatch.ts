// Auto-dispatch system for assigning officers to hotspots based on severity

import type { Hotspot, PatrolRoute } from '@/services/api';

interface DispatchAssignment {
    hotspot: Hotspot;
    assignedPatrols: PatrolRoute[];
    requiredOfficers: number;
}

// Determine required officers based on severity
export function getRequiredOfficers(riskLevel: string): number {
    switch (riskLevel) {
        case 'critical':
            return 3;
        case 'high':
            return 2;
        case 'medium':
            return 1;
        case 'low':
        default:
            return 1;
    }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Get patrol's current position
function getPatrolPosition(patrol: PatrolRoute): { lat: number; lon: number } {
    if (patrol.current_position) {
        return patrol.current_position;
    }
    return { lat: patrol.lat, lon: patrol.lon };
}

// Auto-dispatch officers to hotspots based on severity and proximity
export function autoDispatchOfficers(
    hotspots: Hotspot[],
    patrols: PatrolRoute[]
): DispatchAssignment[] {
    const assignments: DispatchAssignment[] = [];
    const assignedPatrolIds = new Set<string>();

    // Sort hotspots by severity (critical first)
    const sortedHotspots = [...hotspots].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (
            (severityOrder[a.risk_level] || 3) - (severityOrder[b.risk_level] || 3)
        );
    });

    // Get available (active) patrols
    const availablePatrols = patrols.filter(
        (p) => p.status === 'active' && !assignedPatrolIds.has(p.id)
    );

    for (const hotspot of sortedHotspots) {
        const requiredOfficers = getRequiredOfficers(hotspot.risk_level);
        const assignedPatrolsForHotspot: PatrolRoute[] = [];

        // Find nearest available patrols
        const patrolsWithDistance = availablePatrols
            .filter((p) => !assignedPatrolIds.has(p.id))
            .map((patrol) => {
                const pos = getPatrolPosition(patrol);
                const distance = calculateDistance(
                    hotspot.latitude,
                    hotspot.longitude,
                    pos.lat,
                    pos.lon
                );
                return { patrol, distance };
            })
            .sort((a, b) => a.distance - b.distance);

        // Assign required number of officers
        for (let i = 0; i < requiredOfficers && i < patrolsWithDistance.length; i++) {
            const { patrol } = patrolsWithDistance[i];
            assignedPatrolsForHotspot.push(patrol);
            assignedPatrolIds.add(patrol.id);
        }

        if (assignedPatrolsForHotspot.length > 0) {
            assignments.push({
                hotspot,
                assignedPatrols: assignedPatrolsForHotspot,
                requiredOfficers,
            });
        }
    }

    return assignments;
}

// Format dispatch summary for display
export function formatDispatchSummary(assignments: DispatchAssignment[]): string {
    const totalDispatched = assignments.reduce(
        (sum, a) => sum + a.assignedPatrols.length,
        0
    );
    const critical = assignments.filter(
        (a) => a.hotspot.risk_level === 'critical'
    ).length;
    const high = assignments.filter((a) => a.hotspot.risk_level === 'high').length;

    return `${totalDispatched} officers dispatched (${critical} critical, ${high} high priority)`;
}
