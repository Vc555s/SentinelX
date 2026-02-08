import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle, MapPin, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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

const Predictions = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["predictions"],
        queryFn: fetchPredictions,
        refetchInterval: 60000, // Refresh every minute
    });

    const getRiskColor = (level: string) => {
        switch (level) {
            case "critical": return "bg-destructive/10 text-destructive border-destructive/20";
            case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
            case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            default: return "bg-green-500/10 text-green-500 border-green-500/20";
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Predictive Policing</h1>
                <p className="text-muted-foreground">
                    AI-driven crime hotspot forecasting and risk assessment.
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        Could not load predictions. Please ensure the backend and ML engine are running.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card/50 backdrop-blur-sm border-sidebar-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Hotspots</CardTitle>
                        <Shield className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.hotspots.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Identified grid cells</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-sidebar-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Highest Risk</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.hotspots[0]?.risk_score ? `${(data.hotspots[0].risk_score * 100).toFixed(0)}%` : "0%"}
                        </div>
                        <p className="text-xs text-muted-foreground">Max risk score</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-sidebar-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Top Threat</CardTitle>
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">
                            {data?.hotspots[0]?.predicted_crime_type || "None"}
                        </div>
                        <p className="text-xs text-muted-foreground">Most likely incident</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur-sm border-sidebar-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Updated At</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {data?.generated_at ? new Date(data.generated_at).toLocaleTimeString() : "--:--:--"}
                        </div>
                        <p className="text-xs text-muted-foreground">Latest model inference</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card/50 backdrop-blur-sm border-sidebar-border overflow-hidden">
                <CardHeader>
                    <CardTitle>Predicted Hotspots</CardTitle>
                    <CardDescription>
                        Live grid-based risk predictions for the current hour.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className="rounded-md border border-sidebar-border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-sidebar-accent/50">
                                    <TableRow>
                                        <TableHead>Location (Lat, Lon)</TableHead>
                                        <TableHead>Crime Type</TableHead>
                                        <TableHead>Risk Level</TableHead>
                                        <TableHead className="text-right">Risk Score</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.hotspots.map((hotspot, idx) => (
                                        <TableRow key={idx} className="hover:bg-sidebar-accent/30 transition-colors">
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                                            </TableCell>
                                            <TableCell className="capitalize">{hotspot.predicted_crime_type}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getRiskColor(hotspot.risk_level)}>
                                                    {hotspot.risk_level}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {(hotspot.risk_score * 100).toFixed(0)}%
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!data || data.hotspots.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No significant hotspots predicted for the current time.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Predictions;
