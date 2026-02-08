import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import { Expand, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useHotspots } from '@/hooks/useApi';
import { useTheme } from '@/hooks/useTheme';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox token from yatayat-2 project
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FlZWQ3MjAiLCJhIjoiY21pcHMydjVvMGZoNTNocXZmajVjNTk1ciJ9.Ldso4Yux-7OkPhT0HxJkSg';

const riskColors: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

interface MiniMapProps {
  focusPos?: [number, number];
}

export function MiniMap({ focusPos }: MiniMapProps) {
  const { data: hotspots, isLoading } = useHotspots();
  const { theme } = useTheme();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const focusMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const themeRef = useRef(theme);

  // Keep theme ref updated
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Get map style based on theme
  const getMapStyle = (currentTheme?: string) => {
    const t = currentTheme || themeRef.current;
    return t === 'light'
      ? 'mapbox://styles/mapbox/light-v11'
      : 'mapbox://styles/mapbox/dark-v11';
  };

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: getMapStyle(theme),
        center: [72.8777, 19.0760], // Mumbai
        zoom: 12,
        attributionControl: false,
      });

      map.current.on('load', () => {
        setMapLoaded(true);
        // Trigger resize for proper rendering
        setTimeout(() => map.current?.resize(), 100);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
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
    } catch (error) {
      console.error('Map initialization error:', error);
    }
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.once('style.load', () => {
        // Re-trigger hotspot layer after style loads
        setMapLoaded(false);
        setTimeout(() => setMapLoaded(true), 10);
      });
      map.current.setStyle(getMapStyle(theme));
    }
  }, [theme]);

  // Update hotspots layer - circle markers with risk-based colors
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
      }
    };

    if (map.current.isStyleLoaded()) {
      addHotspots();
    } else {
      map.current.once('style.load', addHotspots);
    }
  }, [hotspots, mapLoaded]);

  // Handle focus position (SOS marker)
  useEffect(() => {
    if (!map.current || !focusPos) return;

    const [lat, lng] = focusPos;

    // Remove old focus marker
    if (focusMarkerRef.current) {
      focusMarkerRef.current.remove();
    }

    // Fly to location
    map.current.flyTo({
      center: [lng, lat],
      zoom: 16,
      duration: 1500
    });

    // Add SOS pinpoint marker with pulsing effect
    const el = document.createElement('div');
    el.className = 'sos-pinpoint';
    el.style.cssText = `
      width: 40px;
      height: 40px;
      background-color: #ef4444;
      border: 4px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);
      animation: pulse-ring 1.5s infinite;
      cursor: pointer;
      z-index: 100;
    `;
    el.innerText = '🚨';

    // Add style for pulse animation if non-existent
    if (!document.getElementById('sos-map-animation')) {
      const style = document.createElement('style');
      style.id = 'sos-map-animation';
      style.innerHTML = `
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML('<b>🚨 EMERGENCY SOS</b><br/>User needs help here!'))
      .addTo(map.current);

    marker.togglePopup();
    focusMarkerRef.current = marker;

    return () => {
      if (focusMarkerRef.current) {
        focusMarkerRef.current.remove();
      }
    };
  }, [focusPos]);

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

      <div className="flex-1 relative min-h-[250px]">
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

