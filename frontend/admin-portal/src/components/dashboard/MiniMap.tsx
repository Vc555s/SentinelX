import { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import { Expand, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useHotspots } from '@/hooks/useApi';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox token from yatayat-2 project
mapboxgl.accessToken = 'pk.eyJ1Ijoic2FlZWQ3MjAiLCJhIjoiY21pcHMydjVvMGZoNTNocXZmajVjNTk1ciJ9.Ldso4Yux-7OkPhT0HxJkSg';

const riskColors: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626',
};

export function MiniMap() {
  const { data: hotspots, isLoading } = useHotspots();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [72.8777, 19.0760], // Mumbai
      zoom: 12,
      attributionControl: false,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update hotspots layer
  useEffect(() => {
    if (!map.current || !mapLoaded || !hotspots) return;

    // Remove existing hotspot layers
    if (map.current.getLayer('hotspots-layer')) {
      map.current.removeLayer('hotspots-layer');
    }
    if (map.current.getSource('hotspots')) {
      map.current.removeSource('hotspots');
    }

    if (hotspots.length > 0) {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: hotspots.map(h => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [h.centroid.lon, h.centroid.lat] },
          properties: {
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
          'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 0, 10, 100, 30],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.5,
          'circle-stroke-width': 0
        }
      });
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
