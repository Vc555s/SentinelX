// API Service - Ready for backend integration
// Replace BASE_URL with your actual backend URL when ready

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface Incident {
  id: string;
  lat: number;
  lon: number;
  type: 'theft' | 'assault' | 'vandalism' | 'robbery' | 'burglary' | 'other';
  status: 'active' | 'investigating' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  description: string;
  sector: string;
}

export interface Hotspot {
  cluster_id: string;
  centroid: { lat: number; lon: number };
  intensity: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_incidents: number;
  radius: number;
}

export interface PatrolRoute {
  id: string;
  name: string;
  officer: string;
  status: 'active' | 'paused' | 'completed';
  coordinates: [number, number][];
  current_position?: { lat: number; lon: number };
}

export interface TrendData {
  date: string;
  actual: number;
  predicted: number;
}

export interface CrimeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface DashboardStats {
  totalIncidents24h: number;
  highAlertZones: number;
  patrolsActive: number;
  resolutionRate: number;
  incidentChange: number;
  alertChange: number;
  patrolChange: number;
  resolutionChange: number;
}

// Mock Data Generators
const generateMockIncidents = (): Incident[] => {
  const types: Incident['type'][] = ['theft', 'assault', 'vandalism', 'robbery', 'burglary', 'other'];
  const statuses: Incident['status'][] = ['active', 'investigating', 'resolved'];
  const severities: Incident['severity'][] = ['low', 'medium', 'high', 'critical'];
  
  // Center around a city (New York coordinates as example)
  const baseLat = 40.7128;
  const baseLon = -74.0060;
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `INC-${String(i + 1).padStart(4, '0')}`,
    lat: baseLat + (Math.random() - 0.5) * 0.1,
    lon: baseLon + (Math.random() - 0.5) * 0.1,
    type: types[Math.floor(Math.random() * types.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    severity: severities[Math.floor(Math.random() * severities.length)],
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    description: `Incident reported at Sector ${Math.floor(Math.random() * 12) + 1}`,
    sector: `Sector ${Math.floor(Math.random() * 12) + 1}`,
  }));
};

const generateMockHotspots = (): Hotspot[] => {
  const baseLat = 40.7128;
  const baseLon = -74.0060;
  const riskLevels: Hotspot['risk_level'][] = ['low', 'medium', 'high', 'critical'];
  
  return Array.from({ length: 8 }, (_, i) => ({
    cluster_id: `A${i + 1}`,
    centroid: {
      lat: baseLat + (Math.random() - 0.5) * 0.08,
      lon: baseLon + (Math.random() - 0.5) * 0.08,
    },
    intensity: Math.random() * 100,
    risk_level: riskLevels[Math.floor(Math.random() * riskLevels.length)],
    predicted_incidents: Math.floor(Math.random() * 10) + 1,
    radius: Math.random() * 500 + 200,
  }));
};

const generateMockPatrolRoutes = (): PatrolRoute[] => {
  const baseLat = 40.7128;
  const baseLon = -74.0060;
  
  return [
    {
      id: 'P-001',
      name: 'Alpha Unit',
      officer: 'Sgt. Johnson',
      status: 'active',
      coordinates: [
        [baseLat - 0.01, baseLon - 0.02],
        [baseLat - 0.015, baseLon - 0.01],
        [baseLat - 0.02, baseLon + 0.01],
        [baseLat - 0.01, baseLon + 0.02],
      ],
      current_position: { lat: baseLat - 0.012, lon: baseLon - 0.015 },
    },
    {
      id: 'P-002',
      name: 'Bravo Unit',
      officer: 'Off. Martinez',
      status: 'active',
      coordinates: [
        [baseLat + 0.01, baseLon - 0.01],
        [baseLat + 0.02, baseLon + 0.01],
        [baseLat + 0.015, baseLon + 0.02],
        [baseLat + 0.005, baseLon + 0.015],
      ],
      current_position: { lat: baseLat + 0.015, lon: baseLon + 0.005 },
    },
    {
      id: 'P-003',
      name: 'Charlie Unit',
      officer: 'Off. Williams',
      status: 'paused',
      coordinates: [
        [baseLat, baseLon - 0.025],
        [baseLat + 0.01, baseLon - 0.015],
        [baseLat + 0.005, baseLon],
      ],
    },
  ];
};

const generateMockTrends = (): TrendData[] => {
  const data: TrendData[] = [];
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const baseValue = 20 + Math.sin(i / 5) * 10;
    data.push({
      date: date.toISOString().split('T')[0],
      actual: i > 7 ? Math.floor(baseValue + Math.random() * 8) : 0,
      predicted: Math.floor(baseValue + Math.random() * 5 + 2),
    });
  }
  
  return data;
};

const generateMockDistribution = (): CrimeDistribution[] => [
  { type: 'Theft', count: 145, percentage: 35 },
  { type: 'Assault', count: 78, percentage: 19 },
  { type: 'Vandalism', count: 62, percentage: 15 },
  { type: 'Robbery', count: 45, percentage: 11 },
  { type: 'Burglary', count: 52, percentage: 12 },
  { type: 'Other', count: 33, percentage: 8 },
];

const generateMockDashboardStats = (): DashboardStats => ({
  totalIncidents24h: 47,
  highAlertZones: 3,
  patrolsActive: 12,
  resolutionRate: 78.5,
  incidentChange: -12,
  alertChange: 1,
  patrolChange: 2,
  resolutionChange: 5.2,
});

// API Functions (using mock data for now)
export const api = {
  // Incidents
  getIncidents: async (): Promise<Incident[]> => {
    // When backend is ready, uncomment:
    // const response = await fetch(`${BASE_URL}/incidents`);
    // return response.json();
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
    return generateMockIncidents();
  },

  // Hotspots
  getHotspots: async (): Promise<Hotspot[]> => {
    // When backend is ready:
    // const response = await fetch(`${BASE_URL}/analytics/hotspots`);
    // return response.json();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockHotspots();
  },

  // Patrol Routes
  getPatrolRoutes: async (): Promise<PatrolRoute[]> => {
    // When backend is ready:
    // const response = await fetch(`${BASE_URL}/patrols`);
    // return response.json();
    
    await new Promise(resolve => setTimeout(resolve, 400));
    return generateMockPatrolRoutes();
  },

  // Trends
  getTrends: async (): Promise<TrendData[]> => {
    // When backend is ready:
    // const response = await fetch(`${BASE_URL}/analytics/trends`);
    // return response.json();
    
    await new Promise(resolve => setTimeout(resolve, 600));
    return generateMockTrends();
  },

  // Crime Distribution
  getCrimeDistribution: async (): Promise<CrimeDistribution[]> => {
    // When backend is ready:
    // const response = await fetch(`${BASE_URL}/analytics/distribution`);
    // return response.json();
    
    await new Promise(resolve => setTimeout(resolve, 400));
    return generateMockDistribution();
  },

  // Dashboard Stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    // When backend is ready:
    // const response = await fetch(`${BASE_URL}/dashboard/stats`);
    // return response.json();
    
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockDashboardStats();
  },
};

export default api;
