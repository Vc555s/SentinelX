import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface UserInfo {
    id: number;
    email: string;
    full_name: string;
    profile_picture?: string;
}

interface AuthContextType {
    user: UserInfo | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for token in URL (callback from OAuth)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            localStorage.setItem('google_token', token);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const storedToken = localStorage.getItem('google_token');
        if (storedToken) {
            fetchUserInfo(storedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchUserInfo = async (token: string) => {
        try {
            const response = await fetch(`${API_URL}/auth/google/me?token=${token}`);
            if (response.ok) {
                const data = await response.json();
                setUser(data);
            } else {
                localStorage.removeItem('google_token');
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error);
            localStorage.removeItem('google_token');
        } finally {
            setIsLoading(false);
        }
    };

    const login = () => {
        window.location.href = `${API_URL}/auth/google/login`;
    };

    const logout = () => {
        localStorage.removeItem('google_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
