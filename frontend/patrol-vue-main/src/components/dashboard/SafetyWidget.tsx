import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, MapPin, ShieldAlert, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Hotspot {
    latitude: number;
    longitude: number;
    risk_score: number;
    predicted_crime_type: string;
    risk_level: 'critical' | 'high' | 'medium' | 'low';
    time: string;
}

interface PredictionResponse {
    hotspots: Hotspot[];
    generated_at: string;
    target_time: string;
}

const fetchPredictions = async (): Promise<PredictionResponse> => {
    const response = await fetch("http://localhost:8000/predictions/hotspots");
    if (!response.ok) {
        throw new Error("Failed to fetch predictions");
    }
    return response.json();
};

export function SafetyWidget() {
    const { data, isLoading } = useQuery({
        queryKey: ["safety_predictions"],
        queryFn: fetchPredictions,
        refetchInterval: 120000, // Refresh every 2 minutes
    });

    // Filter for high/critical risks to show to citizens
    const highRiskHotspots = data?.hotspots.filter(
        h => h.risk_level === 'critical' || h.risk_level === 'high'
    ) || [];

    return (
        <Card className="bg-card shadow-lg border-sidebar-border overflow-hidden">
            <CardHeader className="bg-destructive/5 border-b border-sidebar-border/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        <CardTitle className="text-lg">Safety Alerts</CardTitle>
                    </div>
                    <Badge variant="destructive" className="animate-pulse">
                        Live
                    </Badge>
                </div>
                <CardDescription>
                    High-risk areas predicted for the current hour.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : highRiskHotspots.length > 0 ? (
                    <div className="divide-y divide-sidebar-border">
                        {highRiskHotspots.slice(0, 3).map((hotspot, idx) => (
                            <div key={idx} className="p-4 flex items-start gap-3 hover:bg-sidebar-accent/50 transition-colors">
                                <div className="mt-1">
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-sm capitalize">
                                            {hotspot.predicted_crime_type} Risk
                                        </span>
                                        <Badge variant="outline" className="text-[10px] h-5 bg-orange-500/10 text-orange-500 border-orange-500/20">
                                            {hotspot.risk_level}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        <span>Nearby {hotspot.latitude.toFixed(3)}, {hotspot.longitude.toFixed(3)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center space-y-2">
                        <div className="bg-success/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                            <ShieldAlert className="h-6 w-6 text-success" />
                        </div>
                        <p className="font-medium text-sm text-foreground">City-wide Safety</p>
                        <p className="text-xs text-muted-foreground">No high-risk hotspots detected at this time.</p>
                    </div>
                )}

                <div className="p-3 border-t border-sidebar-border">
                    <Button variant="ghost" size="sm" className="w-full text-xs gap-2 group" asChild>
                        <Link to="/map">
                            View Safety Map
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
