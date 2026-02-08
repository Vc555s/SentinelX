import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import { format } from 'date-fns';
import {
  Layers,
  Eye,
  EyeOff,
  AlertTriangle,
  Navigation,
  MapPin,
  Crosshair,
  Siren,
  Clock,
  CalendarDays,
  Users,
  Zap,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { autoDispatchOfficers, getRequiredOfficers } from '@/utils/autoDispatch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIncidents, usePatrolRoutes } from '@/hooks/useApi';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import type { Incident, Hotspot, PatrolRoute } from '@/services/api';
import api from '@/services/api';
import 'mapbox-gl/dist/mapbox-gl.css';

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
  eta_minutes: number | null;
  patrol_lat: number | null;
  patrol_lng: number | null;
}

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
  const { data: patrols = [] } = usePatrolRoutes();
  const { theme } = useTheme();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const sosMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routeAnimationRef = useRef<number | null>(null);
  const patrolAnimMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [showHotspots, setShowHotspots] = useState(true);
  const [showPatrols, setShowPatrols] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showSOS, setShowSOS] = useState(true);
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState(false);
  const [crimeTypeFilter, setCrimeTypeFilter] = useState<string>('all');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [sosAlerts, setSOSAlerts] = useState<SOSAlert[]>([]);

  // Time slider state
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [isLoadingHotspots, setIsLoadingHotspots] = useState(false);

  // Auto-dispatch assignments
  const dispatchAssignments = useMemo(() => {
    if (!autoDispatchEnabled || hotspots.length === 0 || patrols.length === 0) {
      return [];
    }
    return autoDispatchOfficers(hotspots, patrols);
  }, [autoDispatchEnabled, hotspots, patrols]);

  const filteredIncidents = useMemo(() => {
    if (crimeTypeFilter === 'all') return incidents;
    return incidents.filter((i) => i.type === crimeTypeFilter);
  }, [incidents, crimeTypeFilter]);

  // Get map style based on theme
  const getMapStyle = () => {
    return theme === 'light'
      ? 'mapbox://styles/mapbox/light-v11'
      : 'mapbox://styles/mapbox/dark-v11';
  };

  // Format hour for display
  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:00 ${ampm}`;
  };

  // Fetch hotspots based on selected date and hour
  useEffect(() => {
    const fetchHotspots = async () => {
      setIsLoadingHotspots(true);
      try {
        const data = await api.getHotspotsWithDateTime(selectedDate, selectedHour);
        setHotspots(data);
      } catch (error) {
        console.error('Failed to fetch hotspots:', error);
      } finally {
        setIsLoadingHotspots(false);
      }
    };
    fetchHotspots();
  }, [selectedHour, selectedDate]);

  // Poll for SOS alerts from backend API
  useEffect(() => {
    const loadSOS = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/sos/alerts`);
        if (response.ok) {
          const data = await response.json();
          setSOSAlerts(data);
        }
      } catch (error) {
        console.error('Failed to fetch SOS alerts:', error);
      }
    };

    loadSOS();
    const interval = setInterval(loadSOS, 2000);
    return () => clearInterval(interval);
  }, []);

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
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
      // Trigger resize to ensure proper rendering in expanded view
      setTimeout(() => {
        map.current?.resize();
      }, 100);
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      // Store current state
      const center = map.current.getCenter();
      const zoom = map.current.getZoom();

      map.current.once('style.load', () => {
        // Re-trigger all layer additions after style loads
        setMapLoaded(prev => !prev);
        setTimeout(() => setMapLoaded(true), 10);
      });

      map.current.setStyle(getMapStyle());
    }
  }, [theme]);

  // Update hotspots layer - circle markers with risk-based colors
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const addHotspots = () => {
      if (!map.current) return;

      // Remove existing hotspot layers and sources
      try {
        if (map.current.getLayer('hotspots-layer')) {
          map.current.removeLayer('hotspots-layer');
        }
        if (map.current.getSource('hotspots')) {
          map.current.removeSource('hotspots');
        }
      } catch (e) {
        // Layers might not exist, ignore
      }

      if (showHotspots && hotspots.length > 0) {
        const geojson = {
          type: 'FeatureCollection' as const,
          features: hotspots.map(h => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [h.longitude, h.latitude] },
            properties: {
              risk_level: h.risk_level,
              intensity: h.risk_score * 100,
              crime_type: h.predicted_crime_type,
              location_name: h.location_name || 'Unknown Area',
              risk_score: h.risk_score,
              color: riskColors[h.risk_level] || '#6b7280'
            }
          }))
        };

        map.current.addSource('hotspots', { type: 'geojson', data: geojson });

        // Add circle layer with color based on risk level
        map.current.addLayer({
          id: 'hotspots-layer',
          type: 'circle',
          source: 'hotspots',
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['get', 'intensity'],
              0, 8,
              50, 16,
              100, 28
            ],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.6,
            'circle-stroke-width': 2,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': 0.9
          }
        });

        // Create popup for hover
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 15
        });

        // Add hover event
        map.current.on('mouseenter', 'hotspots-layer', (e) => {
          if (!map.current) return;
          map.current.getCanvas().style.cursor = 'pointer';

          const coords = e.features?.[0]?.geometry;
          const props = e.features?.[0]?.properties;
          if (!coords || !props || coords.type !== 'Point') return;

          const riskColor = props.color || '#6b7280';
          popup.setLngLat(coords.coordinates as [number, number])
            .setHTML(`
              <div style="padding: 8px; min-width: 160px; font-family: system-ui, sans-serif;">
                <div style="font-weight: 700; color: ${riskColor}; margin-bottom: 4px; font-size: 13px; text-transform: uppercase;">
                  ${props.risk_level} Risk
                </div>
                <div style="font-size: 12px; color: #374151;">
                  <div style="margin-bottom: 3px;">📍 <strong>${props.location_name}</strong></div>
                  <div style="margin-bottom: 3px;">🔍 ${props.crime_type}</div>
                  <div>⚠️ Risk Score: ${Math.round(props.risk_score * 100)}%</div>
                </div>
              </div>
            `)
            .addTo(map.current);
        });

        map.current.on('mouseleave', 'hotspots-layer', () => {
          if (!map.current) return;
          map.current.getCanvas().style.cursor = '';
          popup.remove();
        });
      }
    };

    // Wait for style to be fully loaded
    if (map.current.isStyleLoaded()) {
      addHotspots();
    } else {
      map.current.once('style.load', addHotspots);
    }
  }, [hotspots, showHotspots, mapLoaded]);

  // Update patrol routes layer
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const addPatrols = () => {
      if (!map.current) return;

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
    };

    if (map.current.isStyleLoaded()) {
      addPatrols();
    } else {
      map.current.once('style.load', addPatrols);
    }
  }, [patrols, showPatrols, mapLoaded, theme]);

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

  // Update SOS markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing SOS markers
    sosMarkersRef.current.forEach(marker => marker.remove());
    sosMarkersRef.current = [];

    // Add enhanced SOS pulse animation styles
    if (!document.getElementById('sos-map-animation')) {
      const style = document.createElement('style');
      style.id = 'sos-map-animation';
      style.innerHTML = `
        @keyframes sos-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes sos-ring-1 {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes sos-ring-2 {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(3); opacity: 0; }
        }
        @keyframes sos-ring-3 {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        .sos-marker-container {
          position: relative;
          width: 48px;
          height: 48px;
        }
        .sos-marker-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          border: 3px solid #ef4444;
          border-radius: 50%;
          pointer-events: none;
        }
        .sos-marker-ring-1 { animation: sos-ring-1 1.5s infinite; }
        .sos-marker-ring-2 { animation: sos-ring-2 1.5s infinite 0.3s; }
        .sos-marker-ring-3 { animation: sos-ring-3 1.5s infinite 0.6s; }
        .sos-marker-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.8), 0 0 50px rgba(239, 68, 68, 0.4);
          animation: sos-pulse 0.8s ease-in-out infinite;
          cursor: pointer;
          z-index: 10;
        }
        .patrol-marker {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
          cursor: pointer;
          z-index: 5;
        }
      `;
      document.head.appendChild(style);
    }

    if (showSOS && sosAlerts.length > 0) {
      sosAlerts.forEach(alert => {
        if (!alert.latitude || !alert.longitude) return;
        const lat = alert.latitude;
        const lng = alert.longitude;

        // Create SOS marker with triple pulse rings
        const container = document.createElement('div');
        container.className = 'sos-marker-container';
        container.innerHTML = `
          <div class="sos-marker-ring sos-marker-ring-1"></div>
          <div class="sos-marker-ring sos-marker-ring-2"></div>
          <div class="sos-marker-ring sos-marker-ring-3"></div>
          <div class="sos-marker-core">🚨</div>
        `;

        const statusLabel = {
          'pending': '⏳ Awaiting Dispatch',
          'dispatched': '🚔 Patrol Dispatched',
          'en_route': '🚨 Patrol En Route',
          'arrived': '✅ Patrol On Scene',
          'resolved': '✓ Resolved'
        }[alert.dispatch_status] || alert.dispatch_status;

        const marker = new mapboxgl.Marker({ element: container })
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML(`
            <div style="padding: 10px; min-width: 220px;">
              <div style="font-weight: 700; color: #ef4444; margin-bottom: 6px; font-size: 14px;">🚨 EMERGENCY SOS</div>
              <div style="font-size: 12px; color: #333;">
                <div style="margin-bottom: 4px;">📍 ${alert.address || 'Unknown location'}</div>
                <div style="margin-bottom: 4px;">🕐 ${new Date(alert.timestamp).toLocaleString()}</div>
                <div style="padding: 6px; background: #f3f4f6; border-radius: 4px; margin-top: 8px;">
                  <div style="font-weight: 600; color: #1f2937;">${statusLabel}</div>
                  ${alert.dispatch_unit_name ? `<div style="color: #3b82f6; margin-top: 2px;">🚔 ${alert.dispatch_unit_name}</div>` : ''}
                  ${alert.eta_minutes && alert.dispatch_status !== 'arrived' && alert.dispatch_status !== 'resolved' ? `<div style="color: #f59e0b; margin-top: 2px;">⏱️ ETA: ${alert.eta_minutes} min</div>` : ''}
                </div>
              </div>
            </div>
          `))
          .addTo(map.current!);

        sosMarkersRef.current.push(marker);

        // Add patrol marker if dispatched
        if (alert.patrol_lat && alert.patrol_lng && alert.dispatch_status !== 'pending' && alert.dispatch_status !== 'resolved') {
          const patrolEl = document.createElement('div');
          patrolEl.className = 'patrol-marker';
          patrolEl.innerText = '🚔';

          const patrolMarker = new mapboxgl.Marker({ element: patrolEl })
            .setLngLat([alert.patrol_lng, alert.patrol_lat])
            .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`
              <div style="padding: 6px; min-width: 120px;">
                <div style="font-weight: 600; color: #3b82f6;">🚔 ${alert.dispatch_unit_name || 'Patrol Unit'}</div>
                <div style="font-size: 11px; color: #666;">Responding to ${alert.id}</div>
                ${alert.eta_minutes ? `<div style="font-size: 11px; color: #f59e0b;">ETA: ${alert.eta_minutes} min</div>` : ''}
              </div>
            `))
            .addTo(map.current!);

          sosMarkersRef.current.push(patrolMarker);

          // Draw route line from patrol to SOS
          const routeId = `sos-route-${alert.id}`;
          try {
            if (map.current.getLayer(routeId)) map.current.removeLayer(routeId);
            if (map.current.getSource(routeId)) map.current.removeSource(routeId);
          } catch (e) { }

          // Create a curved line (arc) from patrol to SOS
          const patrolPos: [number, number] = [alert.patrol_lng, alert.patrol_lat];
          const sosPos: [number, number] = [lng, lat];

          // Generate arc points
          const numPoints = 50;
          const arcPoints: [number, number][] = [];
          for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const x = patrolPos[0] + (sosPos[0] - patrolPos[0]) * t;
            const y = patrolPos[1] + (sosPos[1] - patrolPos[1]) * t;
            // Add slight curve
            const arcHeight = Math.sin(t * Math.PI) * 0.002;
            arcPoints.push([x, y + arcHeight]);
          }

          map.current.addSource(routeId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: arcPoints }
            }
          });

          map.current.addLayer({
            id: routeId,
            type: 'line',
            source: routeId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.8,
              'line-dasharray': [2, 1]
            }
          });
        }
      });
    }
  }, [sosAlerts, showSOS, mapLoaded]);

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
          <LayerToggle
            label="SOS"
            icon={Siren}
            active={showSOS}
            onClick={() => setShowSOS(!showSOS)}
            color="#dc2626"
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

        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="glass-card h-10 gap-2 text-xs px-3"
            >
              <CalendarDays className="w-4 h-4 text-primary" />
              <span className="font-medium">{format(selectedDate, 'MMM d, yyyy')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Time Slider */}
        <div className="glass-card p-3 flex items-center gap-3 min-w-[180px]">
          <Clock className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Hour</span>
              <span className="font-semibold text-primary">{formatHour(selectedHour)}</span>
            </div>
            <Slider
              value={[selectedHour]}
              onValueChange={(val) => setSelectedHour(val[0])}
              min={0}
              max={23}
              step={1}
              className="w-full"
            />
          </div>
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

        {/* Auto-Dispatch Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAutoDispatchEnabled(!autoDispatchEnabled)}
          className={cn(
            "glass-card h-8 gap-2 text-xs transition-all",
            autoDispatchEnabled && "bg-primary/20 border-primary"
          )}
        >
          {autoDispatchEnabled ? (
            <ToggleRight className="w-4 h-4 text-primary" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          <Zap className={cn("w-3.5 h-3.5", autoDispatchEnabled && "text-primary")} />
          Auto-Dispatch
          {autoDispatchEnabled && dispatchAssignments.length > 0 && (
            <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-bold">
              {dispatchAssignments.reduce((sum, a) => sum + a.assignedPatrols.length, 0)}
            </span>
          )}
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
          {autoDispatchEnabled && dispatchAssignments.length > 0 && (
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-primary font-medium">
                {dispatchAssignments.reduce((sum, a) => sum + a.assignedPatrols.length, 0)} Dispatched
              </span>
            </div>
          )}
          {sosAlerts.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="text-red-500 font-bold">
                {sosAlerts.length} SOS
              </span>
            </div>
          )}
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

      {/* Auto-Dispatch Panel */}
      {autoDispatchEnabled && dispatchAssignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute bottom-6 left-4 z-10 glass-card p-4 space-y-3 max-w-xs max-h-[300px] overflow-y-auto"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Auto-Dispatch Assignments
            </h4>
          </div>
          <div className="space-y-2">
            {dispatchAssignments.map((assignment, idx) => (
              <div key={idx} className="border border-border/50 rounded-lg p-2 bg-card/50">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        assignment.hotspot.risk_level === 'critical'
                          ? '#dc2626'
                          : assignment.hotspot.risk_level === 'high'
                            ? '#f97316'
                            : assignment.hotspot.risk_level === 'medium'
                              ? '#eab308'
                              : '#22c55e',
                    }}
                  />
                  <span className="text-xs font-medium capitalize">
                    {assignment.hotspot.risk_level} Risk
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {assignment.hotspot.location_name || assignment.hotspot.predicted_crime_type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {assignment.assignedPatrols.map((patrol) => (
                    <span
                      key={patrol.id}
                      className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1"
                    >
                      <Users className="w-2.5 h-2.5" />
                      {patrol.officer}
                    </span>
                  ))}
                  {assignment.assignedPatrols.length < assignment.requiredOfficers && (
                    <span className="text-[10px] text-amber-500">
                      ({assignment.requiredOfficers - assignment.assignedPatrols.length} more needed)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground border-t border-border/50 pt-2">
            Total: {dispatchAssignments.reduce((sum, a) => sum + a.assignedPatrols.length, 0)} officers dispatched to {dispatchAssignments.length} hotspots
          </div>
        </motion.div>
      )}
    </div>
  );
}

