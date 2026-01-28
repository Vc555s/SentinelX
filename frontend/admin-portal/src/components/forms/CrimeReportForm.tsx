import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, FileText, AlertTriangle, Send, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const CRIME_TYPES = [
    { value: 'theft', label: 'Theft' },
    { value: 'assault', label: 'Assault' },
    { value: 'burglary', label: 'Burglary' },
    { value: 'vandalism', label: 'Vandalism' },
    { value: 'robbery', label: 'Robbery' },
    { value: 'drugs', label: 'Drug-related' },
    { value: 'murder', label: 'Murder' },
    { value: 'fraud', label: 'Fraud' },
    { value: 'other', label: 'Other' },
];

const MUMBAI_LOCALITIES = [
    'Colaba', 'Fort', 'Churchgate', 'Marine Drive', 'Nariman Point',
    'Bandra West', 'Bandra East', 'Khar', 'Santacruz', 'Vile Parle',
    'Andheri West', 'Andheri East', 'Goregaon', 'Malad', 'Kandivali',
    'Borivali', 'Dahisar', 'Juhu', 'Versova', 'Lokhandwala',
    'Powai', 'Vikhroli', 'Ghatkopar', 'Mulund', 'Thane',
    'Kurla', 'Chembur', 'Wadala', 'Dadar', 'Parel', 'Lower Parel',
    'Worli', 'Mahim', 'Byculla', 'Sion', 'Matunga',
    'Dharavi', 'Antop Hill', 'Sakinaka', 'Marol'
];

interface CrimeReportFormProps {
    onSuccess?: () => void;
}

export function CrimeReportForm({ onSuccess }: CrimeReportFormProps) {
    const [crimeType, setCrimeType] = useState('');
    const [description, setDescription] = useState('');
    const [locationName, setLocationName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [incidentTime, setIncidentTime] = useState('');
    const [useCoordinates, setUseCoordinates] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; firId?: string } | null>(null);
    const [filteredLocalities, setFilteredLocalities] = useState<string[]>([]);

    const handleLocationInput = (value: string) => {
        setLocationName(value);
        if (value.length > 1) {
            const filtered = MUMBAI_LOCALITIES.filter(loc =>
                loc.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredLocalities(filtered.slice(0, 5));
        } else {
            setFilteredLocalities([]);
        }
    };

    const selectLocality = (locality: string) => {
        setLocationName(locality + ', Mumbai');
        setFilteredLocalities([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitResult(null);

        const payload: any = {
            crime_type: crimeType,
            description: description || null,
            incident_time: new Date(incidentTime).toISOString(),
        };

        if (useCoordinates) {
            payload.latitude = parseFloat(latitude);
            payload.longitude = parseFloat(longitude);
        } else {
            payload.location_name = locationName;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/incidents/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitResult({
                    success: true,
                    message: data.message,
                    firId: data.fir_id,
                });
                // Reset form
                setCrimeType('');
                setDescription('');
                setLocationName('');
                setLatitude('');
                setLongitude('');
                setIncidentTime('');
                onSuccess?.();
            } else {
                setSubmitResult({
                    success: false,
                    message: data.detail || 'Failed to report crime',
                });
            }
        } catch (error) {
            setSubmitResult({
                success: false,
                message: 'Network error. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 max-w-2xl mx-auto"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-danger/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-danger" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Report Crime Incident</h2>
                    <p className="text-sm text-muted-foreground">Fill in the details to file a new FIR</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Crime Type */}
                <div className="space-y-2">
                    <Label htmlFor="crimeType" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Crime Type *
                    </Label>
                    <Select value={crimeType} onValueChange={setCrimeType} required>
                        <SelectTrigger className="bg-card/50">
                            <SelectValue placeholder="Select crime type" />
                        </SelectTrigger>
                        <SelectContent>
                            {CRIME_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Provide details about the incident..."
                        className="bg-card/50 min-h-[100px]"
                    />
                </div>

                {/* Location Toggle */}
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Label className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Location *
                        </Label>
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                type="button"
                                onClick={() => setUseCoordinates(false)}
                                className={`px-3 py-1 rounded-full transition-colors ${!useCoordinates ? 'bg-primary text-primary-foreground' : 'bg-card/50 text-muted-foreground'
                                    }`}
                            >
                                By Name
                            </button>
                            <button
                                type="button"
                                onClick={() => setUseCoordinates(true)}
                                className={`px-3 py-1 rounded-full transition-colors ${useCoordinates ? 'bg-primary text-primary-foreground' : 'bg-card/50 text-muted-foreground'
                                    }`}
                            >
                                By Coordinates
                            </button>
                        </div>
                    </div>

                    {useCoordinates ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="latitude">Latitude</Label>
                                <Input
                                    id="latitude"
                                    type="number"
                                    step="any"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    placeholder="19.0760"
                                    className="bg-card/50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="longitude">Longitude</Label>
                                <Input
                                    id="longitude"
                                    type="number"
                                    step="any"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    placeholder="72.8777"
                                    className="bg-card/50"
                                    required
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="relative space-y-2">
                            <Input
                                value={locationName}
                                onChange={(e) => handleLocationInput(e.target.value)}
                                placeholder="e.g., Andheri West, Mumbai"
                                className="bg-card/50"
                                required
                            />
                            {filteredLocalities.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                                    {filteredLocalities.map(locality => (
                                        <button
                                            key={locality}
                                            type="button"
                                            onClick={() => selectLocality(locality)}
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-primary/10 transition-colors"
                                        >
                                            {locality}, Mumbai
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Incident Time */}
                <div className="space-y-2">
                    <Label htmlFor="incidentTime" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Incident Time *
                    </Label>
                    <Input
                        id="incidentTime"
                        type="datetime-local"
                        value={incidentTime}
                        onChange={(e) => setIncidentTime(e.target.value)}
                        className="bg-card/50"
                        required
                    />
                </div>

                {/* Submit Result */}
                {submitResult && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-4 rounded-lg ${submitResult.success
                                ? 'bg-success/20 border border-success/30'
                                : 'bg-danger/20 border border-danger/30'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            {submitResult.success ? (
                                <CheckCircle className="w-5 h-5 text-success" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-danger" />
                            )}
                            <span className={submitResult.success ? 'text-success' : 'text-danger'}>
                                {submitResult.message}
                            </span>
                        </div>
                        {submitResult.firId && (
                            <p className="mt-2 text-sm text-muted-foreground">
                                FIR ID: <span className="font-mono font-bold text-foreground">{submitResult.firId}</span>
                            </p>
                        )}
                    </motion.div>
                )}

                {/* Submit Button */}
                <Button
                    type="submit"
                    disabled={isSubmitting || !crimeType || !incidentTime || (!useCoordinates && !locationName) || (useCoordinates && (!latitude || !longitude))}
                    className="w-full h-12 text-lg"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5 mr-2" />
                            Submit Crime Report
                        </>
                    )}
                </Button>
            </form>
        </motion.div>
    );
}
