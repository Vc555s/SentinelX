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
  latitude: number;
  longitude: number;
  risk_score: number;
  predicted_crime_type: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  time: string;
  location_name?: string;
}

export interface PatrolRoute {
  id: string;
  name: string;
  officer: string;
  status: 'active' | 'paused' | 'completed';
  coordinates: [number, number][];
  current_position?: { lat: number; lon: number };
  lat: number;
  lon: number;
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
  const baseLat = 19.0760; // Mumbai
  const baseLon = 72.8777;
  const riskLevels: Hotspot['risk_level'][] = ['low', 'medium', 'high', 'critical'];
  const crimeTypes = ['theft', 'assault', 'vandalism', 'robbery', 'burglary'];

  return Array.from({ length: 8 }, (_, i) => ({
    latitude: baseLat + (Math.random() - 0.5) * 0.08,
    longitude: baseLon + (Math.random() - 0.5) * 0.08,
    risk_score: Math.random(),
    predicted_crime_type: crimeTypes[Math.floor(Math.random() * crimeTypes.length)],
    risk_level: riskLevels[Math.floor(Math.random() * riskLevels.length)],
    time: new Date().toISOString(),
  }));
};

const generateMockPatrolRoutes = (): PatrolRoute[] => {
  const baseLat = 19.0760; // Mumbai
  const baseLon = 72.8777;

  return [
    {
      id: 'P-001',
      name: 'Alpha Unit',
      officer: 'Inspector Sharma',
      status: 'active',
      coordinates: [
        [baseLat - 0.01, baseLon - 0.02],
        [baseLat - 0.015, baseLon - 0.01],
        [baseLat - 0.02, baseLon + 0.01],
        [baseLat - 0.01, baseLon + 0.02],
      ],
      current_position: { lat: baseLat - 0.012, lon: baseLon - 0.015 },
      lat: baseLat - 0.012,
      lon: baseLon - 0.015,
    },
    {
      id: 'P-002',
      name: 'Bravo Unit',
      officer: 'Sub-Inspector Patil',
      status: 'active',
      coordinates: [
        [baseLat + 0.01, baseLon - 0.01],
        [baseLat + 0.02, baseLon + 0.01],
        [baseLat + 0.015, baseLon + 0.02],
        [baseLat + 0.005, baseLon + 0.015],
      ],
      current_position: { lat: baseLat + 0.015, lon: baseLon + 0.005 },
      lat: baseLat + 0.015,
      lon: baseLon + 0.005,
    },
    {
      id: 'P-003',
      name: 'Charlie Unit',
      officer: 'Constable Deshmukh',
      status: 'active',
      coordinates: [
        [baseLat, baseLon - 0.025],
        [baseLat + 0.01, baseLon - 0.015],
        [baseLat + 0.005, baseLon],
      ],
      lat: baseLat + 0.005,
      lon: baseLon - 0.01,
    },
    {
      id: 'P-004',
      name: 'Delta Unit',
      officer: 'Inspector Kulkarni',
      status: 'active',
      coordinates: [
        [baseLat - 0.02, baseLon + 0.02],
        [baseLat - 0.025, baseLon + 0.03],
      ],
      lat: baseLat - 0.02,
      lon: baseLon + 0.025,
    },
    {
      id: 'P-005',
      name: 'Echo Unit',
      officer: 'Sub-Inspector Joshi',
      status: 'active',
      coordinates: [
        [baseLat + 0.03, baseLon - 0.02],
        [baseLat + 0.035, baseLon - 0.01],
      ],
      lat: baseLat + 0.03,
      lon: baseLon - 0.015,
    },
    {
      id: 'P-006',
      name: 'Foxtrot Unit',
      officer: 'Constable Wagh',
      status: 'paused',
      coordinates: [
        [baseLat - 0.015, baseLon - 0.03],
        [baseLat - 0.01, baseLon - 0.025],
      ],
      lat: baseLat - 0.012,
      lon: baseLon - 0.027,
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
    try {
      const response = await fetch(`${BASE_URL}/incidents`);
      if (!response.ok) throw new Error('API Error');
      return response.json();
    } catch (e) {
      console.warn('Falling back to mock incidents');
      return generateMockIncidents();
    }
  },

  // Hotspots
  getHotspots: async (): Promise<Hotspot[]> => {
    try {
      const response = await fetch(`${BASE_URL}/predictions/hotspots`);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      return data.hotspots;
    } catch (e) {
      console.warn('Falling back to mock hotspots');
      return generateMockHotspots();
    }
  },

  // Hotspots with hour parameter
  getHotspotsWithHour: async (hour: number): Promise<Hotspot[]> => {
    try {
      const response = await fetch(`${BASE_URL}/predictions/hotspots?hour=${hour}`);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      return data.hotspots;
    } catch (e) {
      console.warn('Falling back to mock hotspots');
      return generateMockHotspots();
    }
  },

  // Hotspots with date and hour parameters for future predictions
  getHotspotsWithDateTime: async (date: Date, hour: number): Promise<Hotspot[]> => {
    try {
      const day = date.getDay(); // 0 = Sunday, convert to 0 = Monday
      const dayOfWeek = day === 0 ? 6 : day - 1; // Convert to Monday = 0
      const response = await fetch(`${BASE_URL}/predictions/hotspots?hour=${hour}&day=${dayOfWeek}`);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      return data.hotspots;
    } catch (e) {
      console.warn('Falling back to mock hotspots');
      return generateMockHotspots();
    }
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
