import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AdminUser {
    id: number;
    username: string | null;
    phone_number: string | null;
    full_name: string;
    email: string | null;
}

interface OTPRequestPayload {
    telegram_username?: string;
    phone_number?: string;
}

interface OTPVerifyPayload {
    telegram_username?: string;
    phone_number?: string;
    otp: string;
}

interface AdminAuthContextType {
    admin: AdminUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    requestOTP: (payload: OTPRequestPayload) => Promise<{ success: boolean; message: string; demo_hint?: string }>;
    verifyOTP: (payload: OTPVerifyPayload) => Promise<{ success: boolean; message: string }>;
    logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [admin, setAdmin] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            fetchAdminInfo(token);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchAdminInfo = async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/admin/me?token=${token}`);
            if (response.ok) {
                const data = await response.json();
                setAdmin(data);
            } else {
                localStorage.removeItem('admin_token');
            }
        } catch (error) {
            console.error('Failed to fetch admin info:', error);
            localStorage.removeItem('admin_token');
        } finally {
            setIsLoading(false);
        }
    };

    const requestOTP = async (payload: OTPRequestPayload) => {
        try {
            const response = await fetch(`${API_URL}/auth/admin/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            return { success: true, message: data.message, demo_hint: data.demo_hint };
        } catch (error) {
            return { success: false, message: 'Failed to request OTP. Please try again.' };
        }
    };

    const verifyOTP = async (payload: OTPVerifyPayload) => {
        try {
            const response = await fetch(`${API_URL}/auth/admin/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('admin_token', data.access_token);
                setAdmin(data.admin);
                return { success: true, message: 'Login successful!' };
            } else {
                const error = await response.json();
                return { success: false, message: error.detail || 'Invalid OTP' };
            }
        } catch (error) {
            return { success: false, message: 'Verification failed. Please try again.' };
        }
    };

    const logout = () => {
        localStorage.removeItem('admin_token');
        setAdmin(null);
    };

    return (
        <AdminAuthContext.Provider value={{
            admin,
            isLoading,
            isAuthenticated: !!admin,
            requestOTP,
            verifyOTP,
            logout
        }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }
    return context;
}
