import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import { format } from 'date-fns';
import { Expand, Layers, Clock, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTheme } from '@/hooks/useTheme';
import 'mapbox-gl/dist/mapbox-gl.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Mapbox token
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FlZWQ3MjAiLCJhIjoiY21pcHMydjVvMGZoNTNocXZmajVjNTk1ciJ9.Ldso4Yux-7OkPhT0HxJkSg';

const riskColors: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

interface Hotspot {
  latitude: number;
  longitude: number;
  risk_score: number;
  predicted_crime_type: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  time: string;
  location_name?: string;
}

export function MiniMap() {
  const { theme } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Date and time state
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Format hour for display
  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:00 ${ampm}`;
  };

  // Fetch hotspots based on selected date and hour
  useEffect(() => {
    const fetchHotspots = async () => {
      setIsLoading(true);
      try {
        const day = selectedDate.getDay();
        const dayOfWeek = day === 0 ? 6 : day - 1; // Convert to Monday = 0
        const response = await fetch(
          `${API_BASE_URL}/predictions/hotspots?hour=${selectedHour}&day=${dayOfWeek}`
        );
        if (response.ok) {
          const data = await response.json();
          setHotspots(data.hotspots || []);
        }
      } catch (error) {
        console.error('Failed to fetch hotspots:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHotspots();
  }, [selectedHour, selectedDate]);

  // Get map style based on theme
  const getMapStyle = () => {
    return theme === 'light'
      ? 'mapbox://styles/mapbox/light-v11'
      : 'mapbox://styles/mapbox/dark-v11';
  };

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      center: [72.8777, 19.0760], // Mumbai
      zoom: 12,
      attributionControl: false,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      setTimeout(() => map.current?.resize(), 100);
    });

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
      map.current.once('style.load', () => {
        setMapLoaded(false);
        setTimeout(() => setMapLoaded(true), 10);
      });
      map.current.setStyle(getMapStyle());
    }
  }, [theme]);

  // Update hotspots layer
  useEffect(() => {
    if (!map.current || !mapLoaded || !hotspots) return;

    const addHotspots = () => {
      if (!map.current) return;

      try {
        if (map.current.getLayer('hotspots-layer')) {
          map.current.removeLayer('hotspots-layer');
        }
        if (map.current.getSource('hotspots')) {
          map.current.removeSource('hotspots');
        }
      } catch (e) { }

      if (hotspots.length > 0) {
        const geojson = {
          type: 'FeatureCollection' as const,
          features: hotspots.map(h => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [h.longitude, h.latitude] },
            properties: {
              intensity: h.risk_score * 100,
              risk_level: h.risk_level,
              crime_type: h.predicted_crime_type,
              location_name: h.location_name || 'Mumbai',
              risk_score: h.risk_score,
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
            'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 6, 50, 12, 100, 20],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.6,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': ['get', 'color'],
            'circle-stroke-opacity': 0.9
          }
        });

        // Create popup for hover
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12
        });

        map.current.on('mouseenter', 'hotspots-layer', (e) => {
          if (!map.current) return;
          map.current.getCanvas().style.cursor = 'pointer';

          const coords = e.features?.[0]?.geometry;
          const props = e.features?.[0]?.properties;
          if (!coords || !props || coords.type !== 'Point') return;

          const riskColor = props.color || '#6b7280';
          popup.setLngLat(coords.coordinates as [number, number])
            .setHTML(`
              <div style="padding: 8px; min-width: 140px; font-family: system-ui, sans-serif;">
                <div style="font-weight: 700; color: ${riskColor}; margin-bottom: 4px; font-size: 12px; text-transform: uppercase;">
                  ${props.risk_level} Risk
                </div>
                <div style="font-size: 11px; color: #374151;">
                  <div style="margin-bottom: 2px;">📍 <strong>${props.location_name}</strong>, Mumbai</div>
                  <div style="margin-bottom: 2px;">🔍 Predicted: ${props.crime_type}</div>
                  <div>⚠️ Risk: ${Math.round(props.risk_score * 100)}%</div>
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

    if (map.current.isStyleLoaded()) {
      addHotspots();
    } else {
      map.current.once('style.load', addHotspots);
    }
  }, [hotspots, mapLoaded]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card overflow-hidden h-full flex flex-col"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Hotspot Overview
          </h3>
        </div>
        <Link to="/map">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-primary"
          >
            <Expand className="w-3 h-3 mr-1" />
            Expand
          </Button>
        </Link>
      </div>

      {/* Date and Time Controls */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/30 flex items-center gap-3 flex-wrap">
        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs px-2 bg-card/50"
            >
              <CalendarDays className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{format(selectedDate, 'MMM d')}</span>
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
        <div className="flex items-center gap-2 flex-1 min-w-[120px]">
          <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <Slider
            value={[selectedHour]}
            onValueChange={(val) => setSelectedHour(val[0])}
            min={0}
            max={23}
            step={1}
            className="w-full"
          />
          <span className="text-xs font-medium text-primary whitespace-nowrap">
            {formatHour(selectedHour)}
          </span>
        </div>
      </div>

      <div className="flex-1 relative min-h-[300px]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div ref={mapContainer} className="h-full w-full" />
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 glass-card p-2 text-xs space-y-1 z-10">
          {Object.entries(riskColors).map(([level, color]) => (
            <div key={level} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize text-muted-foreground">{level}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

