import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  Users,
  CheckCircle2,
  Bell,
  LifeBuoy,
  Loader2,
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { MiniMap } from '@/components/dashboard/MiniMap';
import { CrimeChart } from '@/components/dashboard/CrimeChart';
import { SafetyWidget } from '@/components/dashboard/SafetyWidget';
import { useDashboardStats } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// TomTom API Key for reverse geocoding
const TOMTOM_API_KEY = "riFTeh0wpjONJX0XItCu3qmHWF657Mia";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { toast } = useToast();
  const [isSOSLoading, setIsSOSLoading] = useState(false);

  const handleSOS = async () => {
    if (!("geolocation" in navigator)) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive"
      });
      return;
    }

    setIsSOSLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address = "Emergency SOS Location";

        try {
          // Reverse geocode using TomTom API
          const response = await fetch(
            `https://api.tomtom.com/search/2/reverseGeocode/${latitude},${longitude}.json?key=${TOMTOM_API_KEY}`
          );
          const data = await response.json();
          if (data.addresses && data.addresses.length > 0) {
            address = data.addresses[0].address.freeformAddress;
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
        }

        // Call backend SOS API
        try {
          const sosResponse = await fetch(`${API_BASE_URL}/sos/trigger`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude,
              longitude,
              address,
              message: `🚨 SOS EMERGENCY: User needs help near ${address}`
            })
          });

          if (sosResponse.ok) {
            toast({
              title: "SOS ALERT SENT",
              description: `Emergency help requested at ${address}.`,
              variant: "destructive",
              className: "bg-red-600 text-white font-bold"
            });
          } else {
            throw new Error('Failed to send SOS alert');
          }
        } catch (error) {
          console.error("SOS API call failed:", error);
          toast({
            title: "SOS Alert Failed",
            description: "Could not send SOS alert to server. Please try again.",
            variant: "destructive"
          });
        }

        setIsSOSLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Location Failed",
          description: "Could not get your location for the SOS alert.",
          variant: "destructive"
        });
        setIsSOSLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Citizen Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay informed about safety in your area
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* SOS Button */}
          <Button
            size="lg"
            variant="destructive"
            className="h-10 sm:h-12 px-4 sm:px-6 rounded-xl shadow-2xl shadow-red-500/50 hover:scale-105 active:scale-95 transition-all bg-red-600 hover:bg-red-700 font-bold text-base sm:text-lg gap-2"
            onClick={handleSOS}
            disabled={isSOSLoading}
          >
            {isSOSLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LifeBuoy className="h-5 w-5 animate-pulse" />
            )}
            SOS
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-[10px] font-bold text-danger-foreground rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          <div className="h-8 w-px bg-border" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Last updated</p>
            <p className="text-sm font-mono text-foreground">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </motion.header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Incidents (24h)"
          value={stats?.totalIncidents24h ?? 0}
          change={stats?.incidentChange ?? 0}
          icon={AlertTriangle}
          variant={stats?.incidentChange && stats.incidentChange < 0 ? 'success' : 'danger'}
          delay={0}
        />
        <KPICard
          title="High Alert Zones"
          value={stats?.highAlertZones ?? 0}
          change={stats?.alertChange ?? 0}
          icon={Shield}
          variant="danger"
          delay={0.1}
        />
        <KPICard
          title="Patrols Active"
          value={stats?.patrolsActive ?? 0}
          change={stats?.patrolChange ?? 0}
          icon={Users}
          variant="default"
          delay={0.2}
        />
        <KPICard
          title="Resolution Rate"
          value={`${stats?.resolutionRate ?? 0}%`}
          change={stats?.resolutionChange ?? 0}
          icon={CheckCircle2}
          variant="success"
          delay={0.3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart and Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mini Map */}
          <div className="h-[450px]">
            <MiniMap />
          </div>

          {/* Crime Trend Chart */}
          <div className="h-[320px]">
            <CrimeChart />
          </div>
        </div>

        {/* Right Column - Safety Widget and Activity Feed */}
        <div className="space-y-6 lg:h-[640px]">
          <SafetyWidget />
          <div className="flex-1 overflow-hidden">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}

