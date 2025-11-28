import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { registerUnauthorizedHandler } from '../services/api';

const AuthContext = createContext();

export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        // Register 401 handler
        registerUnauthorizedHandler(() => {
            setUser(null);
        });

        // Check if user is already logged in
        authService.getMe()
            .then(res => {
                console.log('Session check success:', res.data);
                console.log('User roles:', res.data.roles);
                console.log('Is admin:', res.data.is_admin);
                setUser(res.data);
            })
            .catch(err => {
                console.log('Session check failed:', err.response?.status, err.response?.data);
                setUser(null);
            })
            .finally(() => setIsInitializing(false));
    }, []);

    const login = async (email, password) => {
        const res = await authService.login({ email, password });
        console.log('Login response:', res.data);
        console.log('User data:', res.data.user);
        console.log('User roles:', res.data.user.roles);
        console.log('Is admin:', res.data.user.is_admin);
        setUser(res.data.user);
        return true;
    };

    const register = async (data) => {
        const res = await authService.register(data);
        setUser(res.data.user);
        return true;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isInitializing }}>
            {children}
        </AuthContext.Provider>
    );
}