import { CrimeReportForm } from '@/components/forms/CrimeReportForm';
import { motion } from 'framer-motion';

export default function ReportCrime() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen p-6"
        >
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold gradient-text">Report New Incident</h1>
                    <p className="text-muted-foreground mt-2">
                        File a new FIR by providing incident details and location
                    </p>
                </div>

                <CrimeReportForm />
            </div>
        </motion.div>
    );
}
