import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as loginApi, register as registerApi, getMe } from '../services/api';

const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user nếu đã có token
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            getMe()
                .then(res => setUser(res.data)) // API trả về { user_id, email... }
                .catch(() => localStorage.removeItem('token'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await loginApi(email, password);
        // API trả về { token: "..." }
        if (res.data.token) {
            localStorage.setItem('token', res.data.token);
            const userRes = await getMe(); // Lấy info user ngay sau khi có token
            setUser(userRes.data);
            return true;
        }
        return false;
    };

    const register = async (data) => {
        return registerApi(data);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
}