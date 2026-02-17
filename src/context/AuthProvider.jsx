"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user sudah login saat pertama kali load
  useEffect(() => {
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = useCallback(async (username, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.login(username, password);
      const { token, user: userData } = response.data;

      // Save user data ke localStorage
      const userInfo = {
        id: userData.id,
        username: userData.username,
        role: userData.role,
        token, // Simpan token (alternative jika tidak pakai httpOnly cookie)
      };
      localStorage.setItem('user', JSON.stringify(userInfo));
      localStorage.setItem('token', token);
      setUser(userInfo);
      setIsAuthenticated(true);

      return { success: true, data: userInfo };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Login gagal';
      setError(errorMessage);
      setIsAuthenticated(false);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Check if user is operator
  const isOperator = user?.role === 'operator';

  const value = {
    user,
    isLoading,
    error,
    isAuthenticated,
    login,
    logout,
    isAdmin,
    isOperator,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook untuk menggunakan Auth Context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};