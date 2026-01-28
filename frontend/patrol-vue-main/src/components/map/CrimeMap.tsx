import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import {
  Layers,
  Eye,
  EyeOff,
  AlertTriangle,
  Navigation,
  MapPin,
  Crosshair,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIncidents, useHotspots, usePatrolRoutes } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import type { Incident, Hotspot, PatrolRoute } from '@/services/api';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox token from yatayat-2 project
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FlZWQ3MjAiLCJhIjoiY21pcHMydjVvMGZoNTNocXZmajVjNTk1ciJ9.Ldso4Yux-7OkPhT0HxJkSg';

const riskColors: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

const incidentTypeColors: Record<string, string> = {
  theft: '#f59e0b',
  assault: '#ef4444',
  vandalism: '#8b5cf6',
  robbery: '#dc2626',
  burglary: '#f97316',
  other: '#6b7280',
};

interface LayerToggleProps {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  color?: string;
}

function LayerToggle({ label, icon: Icon, active, onClick, color }: LayerToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'h-8 gap-2 text-xs font-medium transition-all',
        active
          ? 'bg-primary/20 text-primary border border-primary/30'
          : 'bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-border/50'
      )}
    >
      {active ? (
        <Eye className="w-3.5 h-3.5" style={{ color }} />
      ) : (
        <EyeOff className="w-3.5 h-3.5" />
      )}
      {label}
    </Button>
  );
}

export function CrimeMap() {
  const { data: incidents = [] } = useIncidents();
  const { data: hotspots = [] } = useHotspots();
  const { data: patrols = [] } = usePatrolRoutes();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [showHotspots, setShowHotspots] = useState(true);
  const [showPatrols, setShowPatrols] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [crimeTypeFilter, setCrimeTypeFilter] = useState<string>('all');
  const [mapLoaded, setMapLoaded] = useState(false);

  const filteredIncidents = useMemo(() => {
    if (crimeTypeFilter === 'all') return incidents;
    return incidents.filter((i) => i.type === crimeTypeFilter);
  }, [incidents, crimeTypeFilter]);

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [72.8777, 19.0760], // Mumbai
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    // Add geolocate control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.current.addControl(geolocate, 'bottom-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      // Trigger geolocation on load
      geolocate.trigger();
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update hotspots layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing hotspot layers
    if (map.current.getLayer('hotspots-layer')) {
      map.current.removeLayer('hotspots-layer');
    }
    if (map.current.getSource('hotspots')) {
      map.current.removeSource('hotspots');
    }

    if (showHotspots && hotspots.length > 0) {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: hotspots.map(h => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [h.centroid.lon, h.centroid.lat] },
          properties: {
            cluster_id: h.cluster_id,
            risk_level: h.risk_level,
            intensity: h.intensity,
            color: riskColors[h.risk_level] || '#6b7280'
          }
        }))
      };

      map.current.addSource('hotspots', { type: 'geojson', data: geojson });
      map.current.addLayer({
        id: 'hotspots-layer',
        type: 'circle',
        source: 'hotspots',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 20, 100, 50],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.3,
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.8
        }
      });
    }
  }, [hotspots, showHotspots, mapLoaded]);

  // Update patrol routes layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing patrol layers
    if (map.current.getLayer('patrols-layer')) {
      map.current.removeLayer('patrols-layer');
    }
    if (map.current.getSource('patrols')) {
      map.current.removeSource('patrols');
    }

    if (showPatrols && patrols.length > 0) {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: patrols.map(p => ({
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: p.coordinates.map(([lat, lon]) => [lon, lat])
          },
          properties: {
            id: p.id,
            status: p.status,
            color: p.status === 'active' ? '#3b82f6' : '#6b7280'
          }
        }))
      };

      map.current.addSource('patrols', { type: 'geojson', data: geojson });
      map.current.addLayer({
        id: 'patrols-layer',
        type: 'line',
        source: 'patrols',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.8
        }
      });
    }
  }, [patrols, showPatrols, mapLoaded]);

  // Update incident markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (showIncidents) {
      filteredIncidents.forEach(incident => {
        const el = document.createElement('div');
        el.className = 'incident-marker';
        el.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: ${incidentTypeColors[incident.type] || '#6b7280'};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
          </div>
        `;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([incident.lon, incident.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px; min-width: 180px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${incident.id}</div>
              <div style="font-size: 12px; color: #666;">
                <div>Type: ${incident.type}</div>
                <div>Severity: ${incident.severity}</div>
                <div>Status: ${incident.status}</div>
              </div>
            </div>
          `))
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    }
  }, [filteredIncidents, showIncidents, mapLoaded]);

  const goToCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        map.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14
        });
      });
    }
  };

  return (
    <div className="h-full w-full relative">
      {/* Controls Overlay */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center gap-3"
      >
        {/* Layer Toggles */}
        <div className="glass-card p-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground ml-1" />
          <LayerToggle
            label="Hotspots"
            icon={AlertTriangle}
            active={showHotspots}
            onClick={() => setShowHotspots(!showHotspots)}
            color="#ef4444"
          />
          <LayerToggle
            label="Patrols"
            icon={Navigation}
            active={showPatrols}
            onClick={() => setShowPatrols(!showPatrols)}
            color="#3b82f6"
          />
          <LayerToggle
            label="Incidents"
            icon={MapPin}
            active={showIncidents}
            onClick={() => setShowIncidents(!showIncidents)}
            color="#f59e0b"
          />
        </div>

        {/* Crime Type Filter */}
        <div className="glass-card p-2">
          <Select value={crimeTypeFilter} onValueChange={setCrimeTypeFilter}>
            <SelectTrigger className="w-[160px] h-8 bg-transparent border-0 text-sm focus:ring-0">
              <SelectValue placeholder="Crime Type" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="theft">Theft</SelectItem>
              <SelectItem value="assault">Assault</SelectItem>
              <SelectItem value="vandalism">Vandalism</SelectItem>
              <SelectItem value="robbery">Robbery</SelectItem>
              <SelectItem value="burglary">Burglary</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Current Location Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={goToCurrentLocation}
          className="glass-card h-8 gap-2 text-xs"
        >
          <Crosshair className="w-3.5 h-3.5" />
          My Location
        </Button>

        {/* Stats */}
        <div className="glass-card px-4 py-2 flex items-center gap-4 text-xs ml-auto">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">{hotspots.filter(h => h.risk_level === 'high' || h.risk_level === 'critical').length}</span> High Alert
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-muted-foreground">
              <span className="text-foreground font-medium">{patrols.filter(p => p.status === 'active').length}</span> Active Patrols
            </span>
          </div>
        </div>
      </motion.div>

      {/* Map Container */}
      <div ref={mapContainer} className="h-full w-full" />

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute bottom-6 right-4 z-10 glass-card p-4 space-y-3"
      >
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Risk Levels
        </h4>
        <div className="space-y-1.5">
          {Object.entries(riskColors).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
              />
              <span className="text-xs text-muted-foreground capitalize">
                {level}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
