import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Send, ArrowRight, CheckCircle, Smartphone } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminLoginPage() {
    const { requestOTP, verifyOTP, isLoading } = useAdminAuth();
    const [step, setStep] = useState<'username' | 'otp'>('username');
    const [telegramUsername, setTelegramUsername] = useState('');
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const [demoHint, setDemoHint] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!telegramUsername.trim()) return;

        setIsSubmitting(true);
        setError('');

        const result = await requestOTP(telegramUsername);

        if (result.success) {
            setMessage(result.message);
            setDemoHint(result.demo_hint || '');
            setStep('otp');
        } else {
            setError(result.message);
        }

        setIsSubmitting(false);
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp.trim()) return;

        setIsSubmitting(true);
        setError('');

        const result = await verifyOTP(telegramUsername, otp);

        if (!result.success) {
            setError(result.message);
        }

        setIsSubmitting(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
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
                        className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 mb-4 shadow-2xl"
                    >
                        <Shield className="w-10 h-10 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-2">
                        SentinelX Admin
                    </h1>
                    <p className="text-slate-400">Police & Government Portal</p>
                </div>

                {/* Login Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl p-8"
                >
                    <AnimatePresence mode="wait">
                        {step === 'username' ? (
                            <motion.form
                                key="username"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleRequestOTP}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <Smartphone className="w-12 h-12 mx-auto text-blue-400 mb-3" />
                                    <h2 className="text-xl font-semibold text-white mb-2">
                                        Telegram Login
                                    </h2>
                                    <p className="text-slate-400 text-sm">
                                        Enter your registered Telegram username to receive a one-time password.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Telegram Username
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                                        <Input
                                            type="text"
                                            value={telegramUsername}
                                            onChange={(e) => setTelegramUsername(e.target.value)}
                                            placeholder="your_username"
                                            className="pl-8 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-red-400 text-sm text-center">{error}</p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isSubmitting || !telegramUsername.trim()}
                                    className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Request OTP
                                            <Send className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="otp"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleVerifyOTP}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-3" />
                                    <h2 className="text-xl font-semibold text-white mb-2">
                                        Enter OTP
                                    </h2>
                                    <p className="text-slate-400 text-sm">
                                        {message}
                                    </p>
                                    {demoHint && (
                                        <p className="text-yellow-400 text-xs mt-2 font-mono">
                                            {demoHint}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        One-Time Password
                                    </label>
                                    <Input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="Enter 6-digit OTP"
                                        className="text-center text-2xl tracking-widest bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                                        maxLength={6}
                                        required
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-400 text-sm text-center">{error}</p>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isSubmitting || otp.length < 6}
                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Verify & Login
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => { setStep('username'); setOtp(''); setError(''); }}
                                    className="w-full text-slate-400 hover:text-white text-sm"
                                >
                                    ← Back to username
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Security Note */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-slate-500 text-xs mt-6"
                >
                    🔐 Secured with Telegram OTP verification
                </motion.p>
            </motion.div>
        </div>
    );
}
