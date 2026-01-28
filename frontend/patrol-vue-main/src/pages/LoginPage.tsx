import { motion } from 'framer-motion';
import { Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const { login, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 mb-4 shadow-2xl"
                    >
                        <Shield className="w-10 h-10 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold gradient-text mb-2">SentinelX</h1>
                    <p className="text-muted-foreground">SafeCity Citizen Portal</p>
                </div>

                {/* Login Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card p-8 text-center"
                >
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        Welcome, Citizen
                    </h2>
                    <p className="text-muted-foreground mb-8">
                        Sign in to access real-time crime maps, safety alerts, and crime statistics for Mumbai.
                    </p>

                    {/* Google Sign In Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={login}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-800 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                        <ArrowRight className="w-5 h-5 ml-auto" />
                    </motion.button>

                    <p className="text-xs text-muted-foreground mt-6">
                        By signing in, you agree to our Terms of Service and Privacy Policy
                    </p>
                </motion.div>

                {/* Features Preview */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 grid grid-cols-3 gap-4 text-center"
                >
                    {[
                        { label: 'Live Crime Map', icon: '🗺️' },
                        { label: 'Safety Alerts', icon: '🔔' },
                        { label: 'Area Stats', icon: '📊' },
                    ].map((feature, i) => (
                        <div key={i} className="p-3 rounded-lg bg-card/50 border border-border/50">
                            <div className="text-2xl mb-1">{feature.icon}</div>
                            <div className="text-xs text-muted-foreground">{feature.label}</div>
                        </div>
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
}
